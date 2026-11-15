import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Index(['createdBy', 'title'], { unique: true })
@Entity('labels')
export class Label extends BaseEntity {
  @Column()
  title!: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true, type: 'int' })
  createdBy?: number;
}
