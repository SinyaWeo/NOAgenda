import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Plugin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'json', nullable: true })
  config?: Record<string, any>;
}
