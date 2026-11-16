import { Entity, Column, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

@Index(['ownerId', 'name'], { unique: true })
@Entity('teams')
export class Team extends BaseEntity {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @ForeignKey(() => User, { name: 'FK_teams_ownerId', onDelete: 'CASCADE' })
  @Column({ nullable: true, type: 'int' })
  ownerId?: number;
}
