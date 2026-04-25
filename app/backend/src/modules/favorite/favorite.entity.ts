import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';
import { Project } from '../project/project.entity';

export enum FavoriteEntityType {
  PROJECT = 'project',
  TASK = 'task',
}

@Entity('favorites')
export class Favorite extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;

  @Column({ type: 'enum', enum: FavoriteEntityType })
  entityType!: FavoriteEntityType;

  @Column()
  entityId!: number;
}
