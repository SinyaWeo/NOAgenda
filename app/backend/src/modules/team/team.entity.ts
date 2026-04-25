import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('teams')
export class Team extends BaseEntity {
  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;
}
