import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from './session.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private readonly repo: Repository<UserSession>,
  ) {}

  findAll(userId: number): Promise<UserSession[]> {
    return this.repo.find({ where: { userId } });
  }

  async revoke(id: number, userId: number): Promise<void> {
    const session = await this.repo.findOne({ where: { id, userId } });
    if (!session) throw new NotFoundException();
    await this.repo.delete(id);
  }
}
