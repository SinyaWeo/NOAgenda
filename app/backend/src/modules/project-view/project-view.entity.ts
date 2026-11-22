import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';

export enum ViewType {
  LIST = 'list',
  KANBAN = 'kanban',
  TABLE = 'table',
  GANTT = 'gantt',
  TIMELINE = 'timeline',
  MINDMAP = 'mindmap',
  CALENDAR = 'calendar',
}

@Entity('project_views')
export class ProjectView extends BaseEntity {
  @Column()
  title!: string;

  @Column({ type: 'enum', enum: ViewType, default: ViewType.LIST })
  viewType!: ViewType;

  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  project!: Node;
}
