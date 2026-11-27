import { Entity, Column, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

/** `ownerId` is the creator (a record only); rights come from `team_members.role`. */
@Index(['ownerId', 'name'], { unique: true })
@Entity('teams')
export class Team extends BaseEntity {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @ForeignKey(() => User, { name: 'FK_teams_ownerId', onDelete: 'SET NULL' })
  @Column({ nullable: true, type: 'int' })
  ownerId?: number;

  /** Members must use two-factor authentication (set by a team manager). */
  @Column({ default: false })
  requireMfa!: boolean;
}
