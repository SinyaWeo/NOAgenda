import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('api_tokens')
export class ApiToken extends BaseEntity {
  @Column()
  userId!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  token!: string;

  @Column({ nullable: true, type: 'datetime' })
  expiresAt?: Date;

  @Column({ nullable: true, type: 'datetime' })
  lastUsedAt?: Date;
}
