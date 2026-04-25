import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('labels')
export class Label extends BaseEntity {
  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  color?: string;
}
