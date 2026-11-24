import { Entity, Column, ForeignKey, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

/** A private one-line scratch note on the dashboard. Convertible to a project, task or idea. */
@Entity('notes')
export class Note extends BaseEntity {
  @Index('IDX_notes_user')
  @ForeignKey(() => User, { name: 'FK_notes_userId', onDelete: 'CASCADE' })
  @Column()
  userId!: number;

  @Column({ type: 'varchar', length: 255 })
  text!: string;

  @Column({ type: 'boolean', default: false })
  done!: boolean;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  doneAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  position!: number;
}
