import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

/**
 * One user's settings for one plugin, e.g. where a notification channel delivers to and which
 * notification types it carries. Secret fields in `settings` are stored encrypted (PluginService).
 */
@Entity('user_plugin_settings')
@Index('UQ_user_plugin', ['userId', 'pluginKey'], { unique: true })
export class UserPluginSetting extends BaseEntity {
  @Column()
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_user_plugin_settings_userId' })
  user?: User;

  @Column({ length: 64 })
  pluginKey!: string;

  @Column({ default: true })
  enabled!: boolean;

  /** Comma-separated notification types this channel carries for the user. */
  @Column({ length: 255, default: '' })
  types!: string;

  /** JSON object of the plugin's user fields. */
  @Column({ type: 'text', nullable: true })
  settings?: string | null;

  /** Outcome of the latest delivery: when, and the error if it failed (null when it worked). */
  @Column({ type: 'datetime', nullable: true })
  lastDeliveryAt?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastError?: string | null;
}
