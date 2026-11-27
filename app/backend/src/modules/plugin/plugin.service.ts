import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Plugin } from './plugin.entity';
import { UserPluginSetting } from './user-plugin-setting.entity';
import { PluginRegistry } from './plugin-registry.service';
import { NOTIFICATION_TYPES, type FieldValues, type PluginDefinition, type PluginField } from './plugin.types';
import { secretBox } from '../../common/secret-box';
import { isDemoMode } from '../../common/demo-users';
import type { NotificationType } from '../notification/notification.entity';

const DEFAULT_MAX = 2048;

/** A field as clients see it: its definition, and for a secret only whether it is set. */
export interface FieldView extends PluginField {
  value: string | null;
  /** Secret fields: whether a value is stored. The value itself is never returned. */
  isSet?: boolean;
}

export interface AdminPluginView {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  /** Has per-user settings (shown in the users' settings once enabled). */
  hasUserSettings: boolean;
  isChannel: boolean;
  fields: FieldView[];
}

export interface UserPluginView {
  key: string;
  name: string;
  description: string;
  isChannel: boolean;
  /** The user has saved settings for it (a row exists). */
  configured: boolean;
  enabled: boolean;
  types: NotificationType[];
  fields: FieldView[];
  lastDeliveryAt: Date | null;
  lastError: string | null;
}

/** New values: a string sets a field, null (or '' for a secret) clears it, a missing key keeps it. */
export type FieldChanges = Record<string, string | null>;

/** Where a secret field of a plugin is stored, for the encryption context. */
const adminContext = (plugin: string, field: string) => `plugin.${plugin}.${field}`;
const userContext = (plugin: string, field: string) => `user_plugin_settings.${plugin}.${field}`;

/** Instance-wide and per-user plugin settings, with secret fields encrypted at rest and never returned. */
@Injectable()
export class PluginService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PluginService.name);

  constructor(
    @InjectRepository(Plugin) private readonly plugins: Repository<Plugin>,
    @InjectRepository(UserPluginSetting) private readonly userSettings: Repository<UserPluginSetting>,
    private readonly registry: PluginRegistry,
  ) {}

  /** One row per registered plugin (off by default); English name/description kept in step with the code. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.sync();
    } catch (err) {
      this.logger.error(`Could not register the built-in plugins: ${(err as Error).message}`);
    }
  }

  async sync(): Promise<void> {
    const defs = this.registry.all();
    if (!defs.length) return;
    const rows = await this.plugins.find({ where: { key: In(defs.map((d) => d.key)) } });
    for (const def of defs) {
      const row = rows.find((r) => r.key === def.key);
      if (!row) {
        await this.plugins.save(
          this.plugins.create({ key: def.key, name: def.name, description: def.description, enabled: false }),
        );
      } else if (row.name !== def.name || row.description !== def.description) {
        await this.plugins.update(row.id, { name: def.name, description: def.description });
      }
    }
  }

  private def(key: string): PluginDefinition {
    const def = this.registry.get(key);
    if (!def) throw new NotFoundException('Unknown plugin');
    return def;
  }

  private async row(key: string): Promise<Plugin> {
    const row = await this.plugins.findOneBy({ key });
    if (!row) throw new NotFoundException('Unknown plugin');
    return row;
  }

  // ---- values: (de)serialising with encrypted secrets

  private decrypt(
    fields: readonly PluginField[],
    stored: Record<string, unknown> | null | undefined,
    ctx: (f: string) => string,
  ): FieldValues {
    const out: FieldValues = {};
    for (const f of fields) {
      const v = stored?.[f.key];
      if (typeof v !== 'string' || v === '') continue;
      out[f.key] = f.kind === 'secret' ? secretBox().decrypt(v, ctx(f.key)) : v;
    }
    return out;
  }

  private encrypt(fields: readonly PluginField[], values: FieldValues, ctx: (f: string) => string): FieldValues {
    const out: FieldValues = {};
    for (const f of fields) {
      const v = values[f.key];
      if (v === undefined || v === '') continue;
      out[f.key] = f.kind === 'secret' ? secretBox().encrypt(v, ctx(f.key)) : v;
    }
    return out;
  }

  /** Apply changes to current values, validating each field against its definition. */
  private merge(fields: readonly PluginField[], current: FieldValues, changes: FieldChanges | undefined): FieldValues {
    const next: FieldValues = { ...current };
    for (const [k, v] of Object.entries(changes ?? {})) {
      const f = fields.find((x) => x.key === k);
      if (!f) throw new BadRequestException(`Unknown setting: ${k}`);
      if (v === null || v === '') {
        delete next[k];
        continue;
      }
      if (typeof v !== 'string') throw new BadRequestException(`${k} must be text`);
      const value = f.kind === 'secret' ? v : v.trim();
      if (value.length > (f.maxLength ?? DEFAULT_MAX)) throw new BadRequestException(`${k} is too long`);
      if (f.kind === 'select' && !f.options?.includes(value))
        throw new BadRequestException(`${k} has an unknown value`);
      if (value === '') delete next[k];
      else next[k] = value;
    }
    return next;
  }

  private missingRequired(fields: readonly PluginField[], values: FieldValues): string[] {
    return fields.filter((f) => f.required && !values[f.key] && !f.default).map((f) => f.key);
  }

  private view(fields: readonly PluginField[], values: FieldValues): FieldView[] {
    return fields.map((f) =>
      f.kind === 'secret'
        ? { ...f, value: null, isSet: !!values[f.key] }
        : { ...f, value: values[f.key] ?? f.default ?? null },
    );
  }

  /** The admin config with defaults filled in (what a channel gets). */
  private withDefaults(fields: readonly PluginField[], values: FieldValues): FieldValues {
    const out: FieldValues = {};
    for (const f of fields) {
      const v = values[f.key] ?? f.default;
      if (v !== undefined) out[f.key] = v;
    }
    return out;
  }

  // ---- admin

  async adminList(): Promise<AdminPluginView[]> {
    const rows = await this.plugins.find();
    return this.registry
      .all()
      .map((def) => {
        const row = rows.find((r) => r.key === def.key);
        return row ? this.adminView(def, row) : null;
      })
      .filter((v): v is AdminPluginView => v !== null);
  }

  private adminView(def: PluginDefinition, row: Plugin): AdminPluginView {
    const values = this.decrypt(def.adminFields, row.config, (f) => adminContext(def.key, f));
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      enabled: row.enabled,
      hasUserSettings: def.userFields.length > 0,
      isChannel: !!def.channel,
      fields: this.view(def.adminFields, values),
    };
  }

  async adminUpdate(key: string, changes: { enabled?: boolean; config?: FieldChanges }): Promise<AdminPluginView> {
    const def = this.def(key);
    const row = await this.row(key);
    if (changes.enabled && isDemoMode()) throw new BadRequestException('Plugins cannot be switched on in the demo');
    const ctx = (f: string) => adminContext(key, f);
    const values = this.merge(def.adminFields, this.decrypt(def.adminFields, row.config, ctx), changes.config);
    const enabled = changes.enabled ?? row.enabled;
    if (enabled) {
      const missing = this.missingRequired(def.adminFields, values);
      if (missing.length) throw new BadRequestException(`Fill in before switching it on: ${missing.join(', ')}`);
    }
    if (changes.config) await def.validateAdmin?.(values);
    await this.plugins.update(row.id, { enabled, config: this.encrypt(def.adminFields, values, ctx) });
    return this.adminView(def, await this.row(key));
  }

  /** Admin config of an enabled plugin with defaults filled in; null when it is off or unknown. */
  async enabledConfig(key: string): Promise<FieldValues | null> {
    const def = this.registry.get(key);
    if (!def) return null;
    const row = await this.plugins.findOneBy({ key, enabled: true });
    if (!row) return null;
    return this.withDefaults(
      def.adminFields,
      this.decrypt(def.adminFields, row.config, (f) => adminContext(key, f)),
    );
  }

  /** Keys of the enabled plugins (that this build still has). */
  async enabledKeys(): Promise<string[]> {
    const rows = await this.plugins.find({ where: { enabled: true }, select: { key: true } });
    return rows.map((r) => r.key).filter((k) => this.registry.get(k));
  }

  /** What any signed-in user may see: the enabled plugins that have per-user settings. */
  async publicList(): Promise<{ key: string; name: string; description: string; isChannel: boolean }[]> {
    const keys = await this.enabledKeys();
    return keys
      .map((k) => this.def(k))
      .filter((d) => d.userFields.length > 0)
      .map((d) => ({ key: d.key, name: d.name, description: d.description, isChannel: !!d.channel }));
  }

  // ---- per user

  private userView(def: PluginDefinition, row: UserPluginSetting | null): UserPluginView {
    const values = row ? this.userValues(def, row) : {};
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      isChannel: !!def.channel,
      configured: !!row,
      enabled: row?.enabled ?? false,
      types: row ? parseTypes(row.types) : [...NOTIFICATION_TYPES],
      fields: this.view(def.userFields, values),
      lastDeliveryAt: row?.lastDeliveryAt ?? null,
      lastError: row?.lastError ?? null,
    };
  }

  /** A user's decrypted settings for one plugin, defaults filled in. */
  userValues(def: PluginDefinition, row: UserPluginSetting): FieldValues {
    const stored = row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null;
    return this.withDefaults(
      def.userFields,
      this.decrypt(def.userFields, stored, (f) => userContext(def.key, f)),
    );
  }

  /** The user's settings for every enabled plugin that has some. */
  async userList(userId: number): Promise<UserPluginView[]> {
    const keys = (await this.enabledKeys()).filter((k) => this.def(k).userFields.length > 0);
    if (!keys.length) return [];
    const rows = await this.userSettings.find({ where: { userId, pluginKey: In(keys) } });
    return keys.map((k) => this.userView(this.def(k), rows.find((r) => r.pluginKey === k) ?? null));
  }

  private async enabledUserPlugin(key: string): Promise<{ def: PluginDefinition; admin: FieldValues }> {
    const def = this.def(key);
    const admin = await this.enabledConfig(key);
    if (!admin || !def.userFields.length) throw new NotFoundException('This plugin is not available');
    return { def, admin };
  }

  async userUpdate(
    userId: number,
    key: string,
    changes: { enabled?: boolean; types?: string[]; settings?: FieldChanges },
  ): Promise<UserPluginView> {
    const { def, admin } = await this.enabledUserPlugin(key);
    const row = await this.userSettings.findOneBy({ userId, pluginKey: key });
    const ctx = (f: string) => userContext(key, f);
    const current = row?.settings
      ? this.decrypt(def.userFields, JSON.parse(row.settings) as Record<string, unknown>, ctx)
      : {};
    const values = this.merge(def.userFields, current, changes.settings);
    const enabled = changes.enabled ?? row?.enabled ?? true;
    if (enabled) {
      const missing = this.missingRequired(def.userFields, values);
      if (missing.length) throw new BadRequestException(`Fill in before switching it on: ${missing.join(', ')}`);
    }
    if (changes.settings) await def.validateUser?.(this.withDefaults(def.userFields, values), admin);
    const types = changes.types ? normaliseTypes(changes.types) : row ? parseTypes(row.types) : [...NOTIFICATION_TYPES];
    const data = {
      enabled,
      types: types.join(','),
      settings: JSON.stringify(this.encrypt(def.userFields, values, ctx)),
      // New settings: forget the result of deliveries made with the old ones.
      ...(changes.settings ? { lastError: null, lastDeliveryAt: null } : {}),
    };
    if (row) await this.userSettings.update(row.id, data);
    else await this.userSettings.save(this.userSettings.create({ userId, pluginKey: key, ...data }));
    return this.userView(def, await this.userSettings.findOneBy({ userId, pluginKey: key }));
  }

  /** Forget the user's settings for a plugin (disconnect). */
  async userRemove(userId: number, key: string): Promise<void> {
    this.def(key);
    await this.userSettings.delete({ userId, pluginKey: key });
  }

  /** The user's settings row and decrypted values for an enabled channel, for a test message. */
  async userChannel(
    userId: number,
    key: string,
  ): Promise<{ def: PluginDefinition; admin: FieldValues; settings: FieldValues; row: UserPluginSetting }> {
    const { def, admin } = await this.enabledUserPlugin(key);
    if (!def.channel) throw new BadRequestException('This plugin is not a notification channel');
    const row = await this.userSettings.findOneBy({ userId, pluginKey: key });
    if (!row) throw new BadRequestException('Save your settings first');
    return { def, admin, settings: this.userValues(def, row), row };
  }

  /** Enabled user settings of these users for these plugins (the channel dispatcher's lookup). */
  async activeUserSettings(userIds: number[], keys: string[]): Promise<UserPluginSetting[]> {
    if (!userIds.length || !keys.length) return [];
    return this.userSettings.find({ where: { userId: In(userIds), pluginKey: In(keys), enabled: true } });
  }

  async recordDelivery(id: number, error: string | null): Promise<void> {
    await this.userSettings.update(id, {
      lastDeliveryAt: new Date(),
      lastError: error ? (error.length > 255 ? error.slice(0, 254) + '…' : error) : null,
    });
  }

  /** For the data export: which plugins the user set up (never their secret values). */
  async exportFor(userId: number): Promise<{ plugin: string; enabled: boolean; types: string[]; createdAt: Date }[]> {
    const rows = await this.userSettings.find({ where: { userId } });
    return rows.map((r) => ({
      plugin: r.pluginKey,
      enabled: r.enabled,
      types: parseTypes(r.types),
      createdAt: r.createdAt,
    }));
  }
}

function parseTypes(s: string): NotificationType[] {
  return s.split(',').filter((t): t is NotificationType => (NOTIFICATION_TYPES as readonly string[]).includes(t));
}

function normaliseTypes(types: string[]): NotificationType[] {
  for (const t of types) {
    if (!(NOTIFICATION_TYPES as readonly string[]).includes(t))
      throw new BadRequestException(`Unknown notification type: ${t}`);
  }
  return NOTIFICATION_TYPES.filter((t) => types.includes(t));
}
