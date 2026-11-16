import { Entity, Column, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

@Index(['createdBy', 'title'], { unique: true })
@Entity('labels')
export class Label extends BaseEntity {
  @Column()
  title!: string;

  @Column({ nullable: true })
  color?: string;

  @ForeignKey(() => User, { name: 'FK_labels_createdBy', onDelete: 'CASCADE' })
  @Column({ nullable: true, type: 'int' })
  createdBy?: number;
}
