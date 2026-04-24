import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Webhook {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  url!: string;

  @Column()
  event!: string;

  @Column({ nullable: true })
  secret?: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'json', nullable: true })
  config?: Record<string, any>;
}
