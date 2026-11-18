import { Entity, Column, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

@Entity('saved_filters')
export class SavedFilter extends BaseEntity {
  @Column()
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'json', nullable: true })
  filters?: object;

  @ForeignKey(() => User, { name: 'FK_saved_filters_userId', onDelete: 'CASCADE' })
  @Column()
  userId!: number;
}
