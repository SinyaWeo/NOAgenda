import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('quotes')
export class Quote extends BaseEntity {
  @Column({ type: 'text' })
  text!: string;

  @Column({ nullable: true, length: 255 })
  author?: string;

  @Column({ default: true })
  isActive!: boolean;
}
