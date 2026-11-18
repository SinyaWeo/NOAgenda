import { SqlRunner, sqlRunner } from '../../common/sql';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { existsSync, unlink } from 'fs';
import { basename, join, resolve } from 'path';

const GRACE_DAYS = Number(process.env.ACCOUNT_DELETION_GRACE_DAYS || 7);
const UPLOADS_DIR = resolve(process.cwd(), 'uploads');
const CHUNK = 500;
/** How often due accounts are purged. Default hourly; lowered only for automated tests. */
const PURGE_INTERVAL_S = Number(process.env.ACCOUNT_PURGE_INTERVAL_SECONDS || 3600);

function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
const marks = (n: number) => Array(n).fill('?').join(',');

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Account lifecycle: scheduled deletion (grace period, then a real purge) and a
 * complete JSON export of a user's own data.
 *
 * Deleting an account removes the user, every project they own (with all tasks,
 * comments, attachments, views, webhooks inside), their personal tasks, labels,
 * teams they own, filters, tokens, sessions, notifications and their comments and
 * uploads elsewhere. Tasks they created inside other people's projects are kept
 * (shared work) but anonymised. Projects shared WITH them are not affected.
 */
@Injectable()
export class AccountService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly ds: DataSource) {}

  onModuleInit() {
    const sweep = () => this.purgeDue().catch((e) => this.logger.error(`Account purge failed: ${e.message}`));
    setTimeout(sweep, Math.min(30, PURGE_INTERVAL_S) * 1000).unref(); // shortly after boot
    this.timer = setInterval(sweep, PURGE_INTERVAL_S * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  get graceDays(): number {
    return GRACE_DAYS;
  }

  // ---------------------------------------------------------------- deletion request

  async requestDeletion(userId: number): Promise<{ scheduledAt: Date }> {
    const scheduledAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);
    await this.ds.query('UPDATE users SET isDeletionRequested = 1, deletionScheduledAt = ? WHERE id = ?', [
      scheduledAt,
      userId,
    ]);
    return { scheduledAt };
  }

  async cancelDeletion(userId: number): Promise<void> {
    await this.ds.query('UPDATE users SET isDeletionRequested = 0, deletionScheduledAt = NULL WHERE id = ?', [userId]);
  }

  /** Purge every account whose grace period has ended. Returns how many were deleted. */
  async purgeDue(): Promise<number> {
    const due: { id: number }[] = await this.ds.query(
      'SELECT id FROM users WHERE isDeletionRequested = 1 AND deletionScheduledAt IS NOT NULL AND deletionScheduledAt <= ?',
      [new Date()],
    );
    let done = 0;
    for (const { id } of due) {
      try {
        await this.purgeUser(id);
        this.logger.log(`Deleted account #${id} (grace period over)`);
        done++;
      } catch (e) {
        this.logger.error(`Could not delete account #${id}: ${(e as Error).message}`);
      }
    }
    return done;
  }

  // ---------------------------------------------------------------- purge

  /** All nodes at or below `roots` (projects/tasks and their descendants). */
  private async descendants(q: SqlRunner, roots: number[]): Promise<number[]> {
    const all = new Set(roots);
    let frontier = roots;
    while (frontier.length) {
      const next: number[] = [];
      for (const part of chunks(frontier)) {
        const rows = await q<{ id: number }>(`SELECT id FROM nodes WHERE parentId IN (${marks(part.length)})`, part);
        for (const r of rows)
          if (!all.has(r.id)) {
            all.add(r.id);
            next.push(r.id);
          }
      }
      frontier = next;
    }
    return [...all];
  }

  /** Irreversibly delete a user and their data (see class comment). One transaction. */
  async purgeUser(userId: number): Promise<void> {
    const files: string[] = [];

    await this.ds.transaction(async (m) => {
      const q = sqlRunner(m);

      const [user] = await q<{ id: number; avatarUrl: string | null }>(
        'SELECT id, avatarUrl FROM users WHERE id = ? FOR UPDATE',
        [userId],
      );
      if (!user) return;

      // Owned projects and personal (top-level) tasks, with everything below them.
      const roots: number[] = (
        await q<{ id: number }>(
          `SELECT id FROM nodes
            WHERE (type = 'project' AND ownerId = ?) OR (type = 'task' AND createdBy = ? AND parentId IS NULL)`,
          [userId, userId],
        )
      ).map((r) => r.id);
      const ids = await this.descendants(q, roots);

      for (const part of chunks(ids)) {
        const inList = marks(part.length);
        const att = await q<{ path: string }>(`SELECT path FROM attachments WHERE nodeId IN (${inList})`, part);
        att.forEach((a) => files.push(a.path));
        // Rows that are not removed by the nodes' ON DELETE CASCADE:
        await q(`DELETE FROM webhook WHERE projectId IN (${inList})`, part);
        await q(`DELETE FROM kanban_buckets WHERE projectId IN (${inList})`, part);
        for (const table of ['favorites', 'subscriptions', 'reactions']) {
          await q(`DELETE FROM ${table} WHERE entityType IN ('project','task') AND entityId IN (${inList})`, part);
        }
        await q(`DELETE FROM nodes WHERE id IN (${inList})`, part);
      }

      // The user's own comments/uploads on other people's items.
      const uploads = await q<{ path: string }>('SELECT path FROM attachments WHERE uploaderId = ?', [userId]);
      uploads.forEach((a) => files.push(a.path));
      await q('DELETE FROM attachments WHERE uploaderId = ?', [userId]);
      await q('DELETE FROM comments WHERE authorId = ?', [userId]);

      // Shared work they created in other people's projects stays, anonymised.
      await q('UPDATE nodes SET createdBy = NULL WHERE createdBy = ?', [userId]);

      // Teams they own (and all memberships), and their memberships elsewhere.
      const teams: number[] = (await q<{ id: number }>('SELECT id FROM teams WHERE ownerId = ?', [userId])).map(
        (r) => r.id,
      );
      for (const part of chunks(teams)) {
        await q(`DELETE FROM team_members WHERE teamId IN (${marks(part.length)})`, part);
      }
      await q('DELETE FROM teams WHERE ownerId = ?', [userId]);
      await q('DELETE FROM team_members WHERE userId = ?', [userId]);

      await q('DELETE FROM labels WHERE createdBy = ?', [userId]); // task_labels cascade
      for (const table of [
        'notifications',
        'saved_filters',
        'api_tokens',
        'user_sessions',
        'favorites',
        'subscriptions',
        'reactions',
        'webhook',
      ]) {
        await q(`DELETE FROM ${table} WHERE userId = ?`, [userId]);
      }

      // project_users / task_assignees / reset + verification tokens cascade from the user row.
      await q('DELETE FROM users WHERE id = ?', [userId]);

      if (user.avatarUrl) files.push(join(UPLOADS_DIR, 'avatars', basename(user.avatarUrl)));
    });

    // Files go only after the database commit succeeded, and only from inside uploads/.
    for (const f of files) {
      const abs = resolve(f);
      if (abs.startsWith(UPLOADS_DIR + '/') && existsSync(abs)) unlink(abs, () => undefined);
    }
  }

  // ---------------------------------------------------------------- export

  /** Everything the app stores about this user, as one JSON document. Secrets are never included. */
  async exportData(userId: number): Promise<Record<string, unknown>> {
    const q = sqlRunner(this.ds);

    const [profile] = await q(
      `SELECT id, username, email, name, language, timezone, theme, defaultProjectId,
              avatarUrl, role, isEmailConfirmed, termsAcceptedAt, createdAt
         FROM users WHERE id = ?`,
      [userId],
    );

    const roots: number[] = (
      await q<{ id: number }>(
        `SELECT id FROM nodes
          WHERE (type = 'project' AND ownerId = ?) OR (type = 'task' AND createdBy = ? AND parentId IS NULL)`,
        [userId, userId],
      )
    ).map((r) => r.id);
    const ownedIds = await this.descendants(q, roots);
    const owned: Record<string, unknown>[] = [];
    for (const part of chunks(ownedIds)) {
      owned.push(
        ...(await q<Record<string, unknown>>(
          `SELECT * FROM nodes WHERE id IN (${marks(part.length)}) ORDER BY id`,
          part,
        )),
      );
    }
    const ownedSet = new Set(ownedIds);
    const elsewhere = (await q<{ id: number }>('SELECT * FROM nodes WHERE createdBy = ? ORDER BY id', [userId])).filter(
      (n) => !ownedSet.has(n.id),
    );

    const teamsOwned = await q('SELECT id, name, description, createdAt FROM teams WHERE ownerId = ?', [userId]);
    const memberships = await q(
      `SELECT t.id AS teamId, t.name AS teamName, m.createdAt
         FROM team_members m JOIN teams t ON t.id = m.teamId WHERE m.userId = ?`,
      [userId],
    );
    const filters = (
      await q('SELECT id, name, description, filters, createdAt FROM saved_filters WHERE userId = ?', [userId])
    ).map((f) => ({ ...f, filters: parseJson(f.filters) }));

    return {
      exportedAt: new Date().toISOString(),
      format: 'noagenda-export-v1',
      profile,
      ownedProjectsAndTasks: owned,
      tasksCreatedInOtherProjects: elsewhere,
      comments: await q('SELECT id, content, nodeId, createdAt FROM comments WHERE authorId = ? ORDER BY id', [userId]),
      attachments: await q('SELECT id, filename, nodeId, createdAt FROM attachments WHERE uploaderId = ? ORDER BY id', [
        userId,
      ]),
      labels: await q('SELECT id, title, color, createdAt FROM labels WHERE createdBy = ?', [userId]),
      savedFilters: filters,
      teamsOwned,
      teamMemberships: memberships,
      sharedProjectsWithMe: await q('SELECT projectId, permission FROM project_users WHERE userId = ?', [userId]),
      favorites: await q('SELECT entityType, entityId, createdAt FROM favorites WHERE userId = ?', [userId]),
      subscriptions: await q('SELECT entityType, entityId, createdAt FROM subscriptions WHERE userId = ?', [userId]),
      reactions: await q('SELECT entityType, entityId, reaction, createdAt FROM reactions WHERE userId = ?', [userId]),
      notifications: await q('SELECT id, message, `read`, createdAt FROM notifications WHERE userId = ? ORDER BY id', [
        userId,
      ]),
      webhooks: await q('SELECT id, url, event, active, projectId, createdAt FROM webhook WHERE userId = ?', [userId]),
      apiTokens: await q(
        'SELECT id, name, tokenPrefix, expiresAt, lastUsedAt, createdAt FROM api_tokens WHERE userId = ?',
        [userId],
      ),
      sessions: await q(
        'SELECT id, userAgent, ipAddress, createdAt, lastUsedAt, expiresAt FROM user_sessions WHERE userId = ?',
        [userId],
      ),
      note: 'Passwords, token hashes and webhook secrets are not exported. Attachment files are not included, only their metadata.',
    };
  }
}
