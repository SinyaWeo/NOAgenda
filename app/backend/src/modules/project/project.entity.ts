import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('projects')
export class Project extends BaseEntity {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  isArchived!: boolean;

  @Column({ nullable: true, type: 'int' })
  ownerId?: number;
}
