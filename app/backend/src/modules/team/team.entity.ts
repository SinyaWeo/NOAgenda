import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Index(['ownerId', 'name'], { unique: true })
@Entity('teams')
export class Team extends BaseEntity {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true, type: 'int' })
  ownerId?: number;
}
