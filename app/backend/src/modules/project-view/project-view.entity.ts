import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Project } from '../project/project.entity';

export enum ViewType {
  LIST = 'list',
  KANBAN = 'kanban',
  TIMELINE = 'timeline',
}

@Entity('project_views')
export class ProjectView extends BaseEntity {
  @Column()
  title!: string;

  @Column({ type: 'enum', enum: ViewType, default: ViewType.LIST })
  type!: ViewType;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: false })
  project!: Project;
}
