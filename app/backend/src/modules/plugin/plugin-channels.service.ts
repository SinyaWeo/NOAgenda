import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationService, type CreatedNotification } from '../notification/notification.service';
import { MailService } from '../mail/mail.service';
import { Translator } from '../../i18n/translator.service';
import { JobQueue } from '../../common/job-queue';
import { PluginRegistry } from './plugin-registry.service';
import { PluginService } from './plugin.service';
import { ChannelError, type ChannelMessage, type FieldValues, type PluginDefinition } from './plugin.types';
import type { UserPluginSetting } from './user-plugin-setting.entity';

/** Waits before the 2nd and 3rd attempt of a delivery. */
export const CHANNEL_RETRY_DELAYS_MS = [2000, 10000];

/**
 * Forwards new notifications to the notification channels (plugins with `channel`) of the users who
 * switched them on for that notification type. Runs in the background with bounded concurrency and a few
 * retries; a failing channel never affects the action that caused the notification. The outcome of the
 * latest delivery is kept on the user's settings so they can see when something is wrong.
 */
@Injectable()
export class PluginChannelService implements OnModuleInit {
  private readonly logger = new Logger(PluginChannelService.name);
  readonly queue = new JobQueue(this.logger, 'Notification channel');

  constructor(
    private readonly notifications: NotificationService,
    private readonly plugins: PluginService,
    private readonly registry: PluginRegistry,
    private readonly mail: MailService,
    private readonly translator: Translator,
  ) {}

  onModuleInit() {
    this.notifications.onCreated((created) => {
      this.dispatch(created).catch((err: unknown) =>
        this.logger.warn(`Notification channel dispatch failed: ${(err as Error).message}`),
      );
    });
  }

  async dispatch(created: CreatedNotification[]): Promise<void> {
    const keys = (await this.plugins.enabledKeys()).filter((k) => this.registry.get(k)?.channel);
    if (!keys.length || !created.length) return;
    const settings = await this.plugins.activeUserSettings([...new Set(created.map((n) => n.userId))], keys);
    if (!settings.length) return;
    const admin = new Map<string, FieldValues | null>();
    for (const k of keys) admin.set(k, await this.plugins.enabledConfig(k));
    const app = await this.mail.appName().catch(() => 'NOAgenda');
    for (const n of created) {
      for (const row of settings) {
        if (row.userId !== n.userId || !row.types.split(',').includes(n.type)) continue;
        const def = this.registry.get(row.pluginKey) as PluginDefinition;
        const config = admin.get(row.pluginKey);
        if (!config) continue;
        const message: ChannelMessage = {
          userId: n.userId,
          type: n.type,
          text: n.message,
          link: this.mail.link(n.kind === 'project' ? `/projects/${n.nodeId}` : `/tasks/${n.nodeId}`),
          linkLabel: this.translator.t(n.language, 'notification.open', { app }),
        };
        this.queue.push(() => this.attempt(def, row, message, config, 0));
      }
    }
  }

  /** One attempt; a retryable failure is queued again after a delay instead of holding a worker. */
  private async attempt(
    def: PluginDefinition,
    row: UserPluginSetting,
    message: ChannelMessage,
    admin: FieldValues,
    n: number,
  ): Promise<void> {
    const error = await this.sendOnce(def, row, message, admin);
    const delay = CHANNEL_RETRY_DELAYS_MS[n];
    if (error && error.retry && delay !== undefined) {
      setTimeout(() => {
        if (!this.queue.push(() => this.attempt(def, row, message, admin, n + 1))) {
          void this.plugins.recordDelivery(row.id, error.message);
        }
      }, delay).unref();
      return;
    }
    await this.plugins.recordDelivery(row.id, error?.message ?? null);
  }

  /** Deliver once with the user's current settings; returns the error, or null on success. Never throws. */
  async sendOnce(
    def: PluginDefinition,
    row: UserPluginSetting,
    message: ChannelMessage,
    admin: FieldValues,
  ): Promise<ChannelError | null> {
    try {
      await def.channel?.send(message, this.plugins.userValues(def, row), admin);
      return null;
    } catch (err) {
      return err instanceof ChannelError ? err : new ChannelError((err as Error).message, false);
    }
  }

  /** "Send a test message" from the user's settings: delivered now, and the outcome returned. */
  async test(userId: number, key: string, language: string | null): Promise<{ ok: boolean; error: string | null }> {
    const { def, admin, row } = await this.plugins.userChannel(userId, key);
    const app = await this.mail.appName().catch(() => 'NOAgenda');
    const error = await this.sendOnce(
      def,
      row,
      {
        userId,
        type: null,
        text: this.translator.t(language, 'notification.channel_test', { app }),
        link: this.mail.link('/'),
        linkLabel: this.translator.t(language, 'notification.open', { app }),
      },
      admin,
    );
    await this.plugins.recordDelivery(row.id, error?.message ?? null);
    return { ok: !error, error: error?.message ?? null };
  }
}
