import { Entity, Column, ManyToOne } from 'typeorm';
import { Project } from '../project/project.entity';
import { BaseEntity } from '@common/base.entity';

@Entity('tasks')
export class Task extends BaseEntity {
  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => Project, { nullable: false })
  project!: Project;
}
