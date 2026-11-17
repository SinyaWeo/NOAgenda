import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiToken } from './api-token.entity';
import { randomToken, sha256 } from '../../common/tokens';

/** Prefix that distinguishes API tokens from JWTs in the Authorization header. */
export const API_TOKEN_PREFIX = 'noa_';

export interface ApiTokenUser {
  id: number;
  username: string;
  role: string;
  tokenId: number;
  scope: 'read' | 'write';
}

@Injectable()
export class ApiTokenService {
  constructor(
    @InjectRepository(ApiToken)
    private readonly repo: Repository<ApiToken>,
  ) {}

  /** Never returns the stored hash. */
  async findAll(userId: number): Promise<Omit<ApiToken, 'token'>[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return rows.map(({ token: _hash, ...safe }) => safe);
  }

  /** The raw token is returned once and only its hash is stored. */
  async create(
    userId: number,
    name: string,
    scope: 'read' | 'write' = 'read',
    expiresAt?: Date,
  ): Promise<Omit<ApiToken, 'token'> & { rawToken: string }> {
    const rawToken = API_TOKEN_PREFIX + randomToken(32);
    const saved = await this.repo.save(
      this.repo.create({ userId, name, token: sha256(rawToken), tokenPrefix: rawToken.slice(0, 8), scope, expiresAt }),
    );
    const { token: _hash, ...safe } = saved;
    return { ...safe, rawToken };
  }

  async remove(id: number, userId: number): Promise<void> {
    const token = await this.repo.findOne({ where: { id, userId } });
    if (!token) throw new NotFoundException();
    await this.repo.delete(id);
  }

  /** Resolve a raw `noa_...` token to its user, or null if unknown/expired. */
  async authenticate(raw: string): Promise<ApiTokenUser | null> {
    if (!raw.startsWith(API_TOKEN_PREFIX)) return null;
    const rows: (ApiTokenUser & { lastUsedAt: Date | null })[] = await this.repo.manager.query(
      `SELECT u.id AS id, u.username AS username, u.role AS role, t.id AS tokenId, t.scope AS scope, t.lastUsedAt AS lastUsedAt
         FROM api_tokens t JOIN users u ON u.id = t.userId
        WHERE t.token = ? AND u.isLocked = 0 AND (t.expiresAt IS NULL OR t.expiresAt > ?)`,
      [sha256(raw), new Date()],
    );
    const row = rows[0];
    if (!row) return null;
    // Record usage at most once a minute to keep reads cheap.
    if (!row.lastUsedAt || Date.now() - new Date(row.lastUsedAt).getTime() > 60_000) {
      await this.repo.update(row.tokenId, { lastUsedAt: new Date() });
    }
    return {
      id: row.id,
      username: row.username,
      role: row.role,
      tokenId: row.tokenId,
      scope: row.scope === 'write' ? 'write' : 'read',
    };
  }
}
