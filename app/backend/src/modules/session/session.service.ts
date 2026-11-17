import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not } from 'typeorm';
import { UserSession } from './session.entity';
import { randomToken, sha256 } from '../../common/tokens';

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
/** A just-rotated token presented again within this window is a parallel request (two tabs), not theft. */
const ROTATION_GRACE_MS = 10_000;

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface SafeSession {
  id: number;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  current: boolean;
}

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

/**
 * Server-side login sessions. Each session owns one rotating refresh token (stored
 * only as a hash). Access JWTs carry the session id, and every request checks the
 * session still exists, so logout / password change / "sign out everywhere" take
 * effect immediately.
 */
@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private purgeTimer?: NodeJS.Timeout;

  onModuleInit() {
    // Expired sessions are already rejected on use; this just keeps the table small.
    const purge = () =>
      this.purgeExpired()
        .then((n) => n && this.logger.log(`Removed ${n} expired session(s)`))
        .catch((e) => this.logger.warn(`Session purge failed: ${e.message}`));
    void purge();
    this.purgeTimer = setInterval(purge, 60 * 60 * 1000);
    this.purgeTimer.unref();
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  constructor(
    @InjectRepository(UserSession)
    private readonly repo: Repository<UserSession>,
  ) {}

  private expiry(): Date {
    return new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  private clip(value: string | undefined, max: number): string | undefined {
    return value ? value.slice(0, max) : undefined;
  }

  async create(userId: number, meta: SessionMeta = {}): Promise<{ session: UserSession; refreshToken: string }> {
    const refreshToken = randomToken(48);
    const session = await this.repo.save(
      this.repo.create({
        userId,
        tokenHash: sha256(refreshToken),
        userAgent: this.clip(meta.userAgent, 512),
        ipAddress: this.clip(meta.ip, 45),
        lastUsedAt: new Date(),
        rotatedAt: new Date(),
        expiresAt: this.expiry(),
      }),
    );
    return { session, refreshToken };
  }

  /**
   * Exchange a refresh token for a new one. Returns `refreshToken: null` when the
   * request lost a benign race (the cookie already holds the newer token).
   * Replaying an older token outside the grace window revokes the whole session.
   */
  async rotate(
    presented: string,
    meta: SessionMeta = {},
  ): Promise<{ session: UserSession; refreshToken: string | null }> {
    const hash = sha256(presented);
    const current = await this.repo.findOne({ where: { tokenHash: hash } });

    if (!current) {
      const replayed = await this.repo.findOne({ where: { prevTokenHash: hash } });
      if (replayed) {
        const recent = !!replayed.rotatedAt && Date.now() - replayed.rotatedAt.getTime() < ROTATION_GRACE_MS;
        if (recent) return { session: replayed, refreshToken: null };
        await this.repo.delete(replayed.id); // token reuse => assume theft, kill the session
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (current.expiresAt && current.expiresAt.getTime() < Date.now()) {
      await this.repo.delete(current.id);
      throw new UnauthorizedException('Session expired');
    }

    // Compare-and-swap on the token we just read: of two parallel rotations exactly one
    // wins; the loser is then handled like a benign replay instead of overwriting the winner.
    const refreshToken = randomToken(48);
    const changes: Partial<UserSession> = {
      prevTokenHash: current.tokenHash,
      tokenHash: sha256(refreshToken),
      lastUsedAt: new Date(),
      rotatedAt: new Date(),
      expiresAt: this.expiry(),
    };
    if (meta.userAgent) changes.userAgent = this.clip(meta.userAgent, 512);
    if (meta.ip) changes.ipAddress = this.clip(meta.ip, 45);
    const res = await this.repo.update({ id: current.id, tokenHash: current.tokenHash }, changes);
    if (!res.affected) {
      const fresh = await this.repo.findOne({ where: { id: current.id } });
      const recent = !!fresh?.rotatedAt && Date.now() - fresh.rotatedAt.getTime() < ROTATION_GRACE_MS;
      if (fresh && fresh.prevTokenHash === hash && recent) return { session: fresh, refreshToken: null };
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.repo.findOne({ where: { id: current.id } });
    if (!session) throw new UnauthorizedException('Invalid refresh token');
    return { session, refreshToken };
  }

  /** Resolve a live session to its user (one query). Used on every authenticated request. */
  async findUserForSession(sessionId: number, userId: number): Promise<SessionUser | null> {
    const rows: SessionUser[] = await this.repo.manager.query(
      `SELECT u.id AS id, u.username AS username, u.role AS role
         FROM user_sessions s JOIN users u ON u.id = s.userId
        WHERE s.id = ? AND s.userId = ? AND u.isLocked = 0 AND (s.expiresAt IS NULL OR s.expiresAt > ?)`,
      [sessionId, userId, new Date()],
    );
    return rows[0] ?? null;
  }

  /** True when the user has a live session that was opened from this IP (their own, known address). */
  async hasActiveSessionFromIp(userId: number, ip: string | undefined): Promise<boolean> {
    if (!ip) return false;
    const rows: unknown[] = await this.repo.manager.query(
      'SELECT 1 FROM user_sessions WHERE userId = ? AND ipAddress = ? AND (expiresAt IS NULL OR expiresAt > ?) LIMIT 1',
      [userId, ip.slice(0, 45), new Date()],
    );
    return rows.length > 0;
  }

  async revokeByRefreshToken(presented: string): Promise<void> {
    await this.repo.delete({ tokenHash: sha256(presented) });
  }

  async revokeById(sessionId: number): Promise<void> {
    await this.repo.delete(sessionId);
  }

  /** Sign a user out everywhere, optionally keeping one session (e.g. the one that just changed the password). */
  async revokeAllForUser(userId: number, exceptSessionId?: number): Promise<void> {
    await this.repo.delete(exceptSessionId ? { userId, id: Not(exceptSessionId) } : { userId });
  }

  async findAll(userId: number, currentSessionId?: number): Promise<SafeSession[]> {
    const rows = await this.repo.find({
      where: [{ userId, expiresAt: MoreThan(new Date()) }],
      order: { lastUsedAt: 'DESC' },
    });
    // Never expose token hashes.
    return rows.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
      current: s.id === currentSessionId,
    }));
  }

  async revoke(id: number, userId: number): Promise<void> {
    const session = await this.repo.findOne({ where: { id, userId } });
    if (!session) throw new NotFoundException();
    await this.repo.delete(id);
  }

  /** Housekeeping: drop expired sessions. */
  async purgeExpired(): Promise<number> {
    const res = await this.repo.createQueryBuilder().delete().where('expiresAt < :now', { now: new Date() }).execute();
    return res.affected ?? 0;
  }
}
