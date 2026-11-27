import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

/**
 * The instance-wide state of one built-in plugin (see PluginRegistry): created on startup, off by default.
 * `config` holds the admin settings; fields the plugin marks secret are stored encrypted (PluginService).
 */
@Entity()
export class Plugin extends BaseEntity {
  @Index('UQ_plugin_key', { unique: true })
  @Column({ length: 64 })
  key!: string;

  /** English name and description, as the plugin registered them (the UI shows translated texts). */
  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ default: false })
  enabled!: boolean;

  @Column({ type: 'json', nullable: true })
  config?: Record<string, string> | null;
}
