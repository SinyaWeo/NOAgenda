import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SqlParam, SqlRunner, sqlRunner } from '../../common/sql';
import { adoptAllNodes, nodeCountsNotOwnedBy } from '../node/node-sql';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { avatarFile, unlinkUploads } from '../account/account.service';
import { UserRole } from '../user/user-role.enum';

export interface SingleUserStatus {
  enabled: boolean;
  userId: number | null;
  switchedAt: string | null;
}

/** What switching to single-user mode for one user would do (the confirm dialog shows it). */
export interface SingleUserPreview {
  target: { id: number; username: string };
  /** Accounts that would be deleted. */
  users: number;
  /** Nodes (trashed included) that would change owner or creator, by type. */
  nodes: { project: number; task: number; idea: number };
  comments: number;
  attachments: { count: number; bytes: number };
  notes: number;
  /** Labels taken over as they are, and labels merged into a same-named one. */
  labels: { moved: number; merged: number };
  teams: number;
  /** Project shares (users and teams) and idea shares that would be deleted. */
  shares: number;
  /** Tasks assigned to someone else, which become assigned to the sole user. */
  assignments: number;
  webhooks: { id: number; url: string }[];
}

/** Tables with everything about who shares what with whom; all emptied by the switch. */
const SHARING_TABLES = ['idea_teams', 'project_teams', 'project_users', 'team_members', 'teams'];
/** Per-user rows of the other accounts, deleted with them (some would cascade, some have no foreign key). */
const PER_USER_TABLES = ['saved_filters', 'subscriptions', 'reactions', 'notifications', 'api_tokens', 'user_sessions'];

const num = (v: unknown) => Number(v ?? 0);

/**
 * The switch between multi-user and single-user mode (see findings/single-user-mode-plan.md).
 *
 * Enabling is irreversible: in one transaction the chosen admin becomes the owner and creator of every
 * node (trashed ones too), the assignee of every assigned task and the author of every comment, upload and
 * quick note; labels are taken over or merged; all teams and sharing are deleted; every other account is
 * deleted with its personal data.
 * Disabling only clears the flag: nothing is moved back.
 */
@Injectable()
export class SingleUserService {
  private readonly logger = new Logger(SingleUserService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly settings: AppSettingsService,
  ) {}

  async status(): Promise<SingleUserStatus> {
    const [mode, userId, at] = await Promise.all(
      ['singleUserMode', 'singleUserId', 'singleUserSwitchedAt'].map((k) => this.settings.get(k)),
    );
    const enabled = mode === 'true';
    return { enabled, userId: enabled && userId ? Number(userId) : null, switchedAt: enabled ? at || null : null };
  }

  async preview(userId: number): Promise<SingleUserPreview> {
    const q = sqlRunner(this.ds);
    const target = await this.target(q, userId);
    const A = target.id;
    const count = async (sql: string, params: SqlParam[] = []) => num((await q<{ n: unknown }>(sql, params))[0]?.n);
    const nodes = await nodeCountsNotOwnedBy(q, A);
    const [att] = await q<{ n: unknown; bytes: unknown }>(
      'SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM attachments WHERE uploaderId <> ?',
      [A],
    );
    return {
      target,
      users: await count('SELECT COUNT(*) AS n FROM users WHERE id <> ?', [A]),
      nodes: { project: nodes.project ?? 0, task: nodes.task ?? 0, idea: nodes.idea ?? 0 },
      comments: await count('SELECT COUNT(*) AS n FROM comments WHERE authorId <> ?', [A]),
      attachments: { count: num(att?.n), bytes: num(att?.bytes) },
      notes: await count('SELECT COUNT(*) AS n FROM notes WHERE userId <> ?', [A]),
      labels: await this.labelPlan(q, A),
      teams: await count('SELECT COUNT(*) AS n FROM teams'),
      shares: await count(
        `SELECT (SELECT COUNT(*) FROM project_users) + (SELECT COUNT(*) FROM project_teams)
              + (SELECT COUNT(*) FROM idea_teams) AS n`,
      ),
      assignments: await count('SELECT COUNT(DISTINCT nodeId) AS n FROM task_assignees WHERE userId <> ?', [A]),
      webhooks: (
        await q<{ id: number; url: string }>(
          'SELECT id, url FROM webhook WHERE userId IS NULL OR userId <> ? ORDER BY id',
          [A],
        )
      ).map((w) => ({ id: Number(w.id), url: w.url })),
    };
  }

  /**
   * Runs as READ COMMITTED: the switch updates whole tables, and under snapshot isolation any row another
   * request changed meanwhile (an audit entry, a notification) would abort it with "Record has changed".
   */
  async enable(
    input: { userId: number; confirmUsername: string },
    actor: { id: number; username: string },
  ): Promise<SingleUserStatus> {
    const files: string[] = [];
    let sole = { id: 0, username: '' };
    let deleted = 0;
    await this.ds.transaction('READ COMMITTED', async (m) => {
      const q = sqlRunner(m);
      // One switch at a time: lock the flag's row (double submits and parallel tabs wait, then fail).
      await q("INSERT IGNORE INTO app_settings (`key`, value) VALUES ('singleUserMode', 'false')");
      const [mode] = await q<{ value: string }>(
        "SELECT value FROM app_settings WHERE `key` = 'singleUserMode' FOR UPDATE",
      );
      if (mode?.value === 'true') throw new ConflictException('Single-user mode is already on');
      sole = await this.target(q, input.userId);
      if (input.confirmUsername !== sole.username) {
        throw new BadRequestException('The typed username does not match the chosen user');
      }
      const A = sole.id;
      // Hold the other accounts: their concurrent writes (a new task, comment, ...) need these rows for
      // their foreign-key checks, so they wait for this switch and then fail instead of slipping in half-way.
      await q('SELECT id FROM users WHERE id <> ? FOR UPDATE', [A]);

      // 1) Sharing first, so the "last manager of a team" rule cannot get in the way.
      for (const t of SHARING_TABLES) await q(`DELETE FROM ${t}`);
      // 2) Every node, trashed ones included.
      await adoptAllNodes(q, A);
      // Assigned tasks stay assigned, to the sole user (as new tasks are), so "assigned to me" keeps working.
      await q('UPDATE IGNORE task_assignees SET userId = ? WHERE userId <> ?', [A, A]);
      await q('DELETE FROM task_assignees WHERE userId <> ?', [A]);
      // 3) Content written by others stays, under the sole user's name.
      await q('UPDATE comments SET authorId = ? WHERE authorId <> ?', [A, A]);
      await q('UPDATE attachments SET uploaderId = ? WHERE uploaderId <> ?', [A, A]);
      await q('UPDATE notes SET userId = ? WHERE userId <> ?', [A, A]);
      // The history of deleted projects shows up in the sole user's own feed.
      await q('UPDATE activities SET ownerId = ? WHERE ownerId IS NOT NULL AND ownerId <> ?', [A, A]);
      // 4) Labels: taken over, or merged into a same-named one (the title is unique per user).
      await this.mergeLabels(q, A);
      // 5) The other accounts, with what is personal to them.
      const avatars = await q<{ avatarUrl: string }>(
        'SELECT avatarUrl FROM users WHERE id <> ? AND avatarUrl IS NOT NULL',
        [A],
      );
      avatars.forEach((r) => files.push(avatarFile(r.avatarUrl)));
      await q('DELETE FROM webhook WHERE userId IS NULL OR userId <> ?', [A]);
      await q('DELETE FROM task_reminders WHERE createdBy <> ?', [A]);
      for (const t of PER_USER_TABLES) await q(`DELETE FROM ${t} WHERE userId <> ?`, [A]);
      const [others] = await q<{ n: unknown }>('SELECT COUNT(*) AS n FROM users WHERE id <> ?', [A]);
      deleted = num(others?.n);
      await q('DELETE FROM users WHERE id <> ?', [A]);
      // 6) The flag.
      await this.write(q, {
        singleUserMode: 'true',
        singleUserId: String(A),
        singleUserSwitchedAt: new Date().toISOString(),
      });
    });
    this.settings.clearModeCache();
    unlinkUploads(files);
    this.logger.log(
      `Single-user mode enabled by ${actor.username} (#${actor.id}) for ${sole.username} (#${sole.id}); ${deleted} other account(s) deleted`,
    );
    return this.status();
  }

  /** Back to multi-user mode: only the flag changes, no data moves. */
  async disable(actor: { id: number; username: string }): Promise<SingleUserStatus> {
    await this.ds.transaction('READ COMMITTED', async (m) => {
      const q = sqlRunner(m);
      const [mode] = await q<{ value: string }>(
        "SELECT value FROM app_settings WHERE `key` = 'singleUserMode' FOR UPDATE",
      );
      if (mode?.value !== 'true') throw new ConflictException('Single-user mode is not on');
      await q("DELETE FROM app_settings WHERE `key` IN ('singleUserMode', 'singleUserId', 'singleUserSwitchedAt')");
    });
    this.settings.clearModeCache();
    this.logger.log(`Single-user mode disabled by ${actor.username} (#${actor.id})`);
    return this.status();
  }

  /** The sole user must be an existing, unlocked admin (so someone can still switch back). */
  private async target(q: SqlRunner, userId: number): Promise<{ id: number; username: string }> {
    const [u] = await q<{ id: number; username: string; role: string; isLocked: unknown }>(
      'SELECT id, username, role, isLocked FROM users WHERE id = ?',
      [userId],
    );
    if (!u) throw new NotFoundException('User not found');
    if (u.role !== UserRole.ADMIN || num(u.isLocked) === 1 || u.isLocked === true) {
      throw new BadRequestException('The sole user must be an active admin');
    }
    return { id: Number(u.id), username: u.username };
  }

  /** What mergeLabels would do: same-named labels (as the database compares them, case-insensitively) are merged. */
  private async labelPlan(q: SqlRunner, A: number): Promise<{ moved: number; merged: number }> {
    const labels = await q<{ createdBy: number | null; title: string }>(
      'SELECT createdBy, title FROM labels ORDER BY id',
    );
    const key = (t: string) => t.trim().toLowerCase();
    const taken = new Set(labels.filter((l) => num(l.createdBy) === A).map((l) => key(l.title)));
    let moved = 0;
    let merged = 0;
    for (const l of labels) {
      if (num(l.createdBy) === A) continue;
      if (taken.has(key(l.title))) merged++;
      else {
        moved++;
        taken.add(key(l.title));
      }
    }
    return { moved, merged };
  }

  private async mergeLabels(q: SqlRunner, A: number): Promise<void> {
    const others = await q<{ id: number; title: string }>(
      'SELECT id, title FROM labels WHERE createdBy IS NULL OR createdBy <> ? ORDER BY id',
      [A],
    );
    for (const l of others) {
      const [same] = await q<{ id: number }>('SELECT id FROM labels WHERE createdBy = ? AND title = ? LIMIT 1', [
        A,
        l.title,
      ]);
      if (same) {
        // Tasks that already carry the sole user's label keep one link; the rest is repointed.
        await q('UPDATE IGNORE task_labels SET labelId = ? WHERE labelId = ?', [same.id, l.id]);
        await q('DELETE FROM labels WHERE id = ?', [l.id]); // leftover duplicate links cascade
      } else {
        await q('UPDATE labels SET createdBy = ? WHERE id = ?', [A, l.id]);
      }
    }
  }

  private async write(q: SqlRunner, values: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      await q('INSERT INTO app_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [
        key,
        value,
      ]);
    }
  }
}
