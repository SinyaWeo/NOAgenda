import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

export enum FavoriteEntityType {
  PROJECT = 'project',
  TASK = 'task',
}

@Index('UQ_favorites_user_entity', ['user', 'entityType', 'entityId'], { unique: true })
@Entity('favorites')
export class Favorite extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;

  @Column({ type: 'enum', enum: FavoriteEntityType })
  entityType!: FavoriteEntityType;

  @Column()
  entityId!: number;
}
