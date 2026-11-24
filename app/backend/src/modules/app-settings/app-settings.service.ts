import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './app-setting.entity';

export const DEFAULT_APP_NAME = 'NOAgenda';

/** Settings only the single-user switch may write (`modules/single-user`), never the generic settings API. */
export const SINGLE_USER_KEYS = ['singleUserMode', 'singleUserId', 'singleUserSwitchedAt'] as const;

/** How long the single-user flag is cached per process (it is read on many requests). */
const MODE_CACHE_MS = 5000;

@Injectable()
export class AppSettingsService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly repo: Repository<AppSetting>,
  ) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.repo.find();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async get(key: string): Promise<string | null> {
    const row = await this.repo.findOne({ where: { key } });
    return row?.value ?? null;
  }

  /** The admin-configured display name (shown in the UI and emails); blank or unset falls back to the default. */
  async getAppName(): Promise<string> {
    const name = (await this.get('appName'))?.trim();
    return name || DEFAULT_APP_NAME;
  }

  private modeCache: { value: boolean; at: number } | null = null;

  /**
   * Whether the instance runs in single-user mode. Cached for a few seconds; the switch clears the cache
   * of the process that made it (other processes catch up within MODE_CACHE_MS).
   */
  async singleUserMode(): Promise<boolean> {
    if (this.modeCache && Date.now() - this.modeCache.at < MODE_CACHE_MS) return this.modeCache.value;
    const value = (await this.get('singleUserMode')) === 'true';
    this.modeCache = { value, at: Date.now() };
    return value;
  }

  clearModeCache(): void {
    this.modeCache = null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.repo.upsert({ key, value }, ['key']);
  }

  async setMany(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, value);
    }
  }
}
