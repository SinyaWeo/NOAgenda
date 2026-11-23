import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

/**
 * One saved state of a node's title and description, so an overwritten text can be read again and
 * restored. No foreign keys, like the activity log; rows are removed with the node.
 */
@Entity('node_revisions')
@Index('IDX_node_revisions_node', ['nodeId', 'id'])
export class NodeRevision extends BaseEntity {
  @Column({ type: 'int' })
  nodeId!: number;

  @Column({ type: 'int', nullable: true })
  actorId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actorName!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
