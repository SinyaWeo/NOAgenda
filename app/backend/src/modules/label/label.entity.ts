import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('labels')
export class Label extends BaseEntity {
  @Column({ unique: true })
  title!: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true, type: 'int' })
  createdBy?: number;
}
