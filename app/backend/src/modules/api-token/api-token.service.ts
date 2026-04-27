import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiToken } from './api-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiTokenService {
  constructor(
    @InjectRepository(ApiToken)
    private readonly repo: Repository<ApiToken>,
  ) {}

  findAll(userId: number): Promise<ApiToken[]> {
    return this.repo.find({ where: { userId } });
  }

  async create(userId: number, name: string, expiresAt?: Date): Promise<ApiToken & { rawToken: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const entity = this.repo.create({ userId, name, token: rawToken, expiresAt });
    const saved = await this.repo.save(entity);
    return { ...saved, rawToken };
  }

  async remove(id: number, userId: number): Promise<void> {
    const token = await this.repo.findOne({ where: { id, userId } });
    if (!token) throw new NotFoundException();
    await this.repo.delete(id);
  }
}
