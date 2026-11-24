import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DomainEvents } from '../../common/domain-events';
import { sqlRunner } from '../../common/sql';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import { projectForTransfer, setProjectOwner } from '../node/node-sql';
import type { TransferredProject } from '../account/account.service';

export interface TransferAnnouncement {
  /** Username of the previous owner (kept as text: the account may be gone); null when there was none. */
  fromName: string | null;
  /** The previous owner, when they still exist: told that their project moved. */
  fromId?: number | null;
  /** Why the admin did it (audit trail). */
  reason?: string;
  to: { id: number; username: string };
  actorId: number;
  actorName: string;
}

/**
 * Changing a project's owner by an admin: a single project on purpose (`transfer`), or all of a user's
 * projects while their account is deleted (AccountService.purgeUser). After the change is committed,
 * `announce` writes one audit trail entry per project (`project.owner_changed`, audit only, never sent to
 * webhooks) and notifies the new owner and, if they still exist, the previous one.
 */
@Injectable()
export class ProjectTransferService {
  constructor(
    private readonly ds: DataSource,
    private readonly events: DomainEvents,
    private readonly notifications: NotificationService,
    private readonly users: UserService,
  ) {}

  /**
   * Hand one project (trashed or not) to another active user. The previous owner keeps Manager access
   * (an `admin` share), so a transfer never locks them out; the new owner's own share becomes redundant
   * and is removed.
   */
  async transfer(
    projectId: number,
    toUserId: number,
    actor: { id: number; username: string },
    reason: string,
  ): Promise<{ id: number; name: string | null; ownerId: number }> {
    const to = await this.users.findById(toUserId);
    if (!to || to.isLocked) throw new BadRequestException('The new project owner must be an active user');
    const project = await this.ds.transaction(async (m) => {
      const q = sqlRunner(m);
      const p = await projectForTransfer(q, projectId);
      if (!p) throw new NotFoundException();
      if (p.ownerId === to.id) throw new BadRequestException('That user already owns the project');
      await setProjectOwner(q, p.id, to.id);
      if (p.ownerId != null) {
        await q(
          `INSERT INTO project_users (projectId, userId, permission) VALUES (?, ?, 'admin')
           ON DUPLICATE KEY UPDATE permission = 'admin'`,
          [p.id, p.ownerId],
        );
      }
      await q('DELETE FROM project_users WHERE projectId = ? AND userId = ?', [p.id, to.id]);
      return p;
    });
    const previous = project.ownerId != null ? await this.users.findById(project.ownerId) : null;
    await this.announce([project], {
      fromName: previous?.username ?? null,
      fromId: previous?.id ?? null,
      to: { id: to.id, username: to.username },
      actorId: actor.id,
      actorName: actor.username,
      reason,
    });
    return { id: project.id, name: project.name, ownerId: to.id };
  }

  async announce(projects: TransferredProject[], a: TransferAnnouncement): Promise<void> {
    for (const p of projects) {
      this.events.emit({
        name: 'project.owner_changed',
        data: { projectId: p.id },
        nodeId: p.id,
        projectId: p.id,
        owner: a.to.id,
        actorId: a.actorId,
        title: p.name,
        changes: { owner: { from: a.fromName, to: a.to.username }, ...(a.reason ? { reason: a.reason } : {}) },
        auditOnly: true,
      });
      await this.notifications.notify({
        type: 'project_transferred',
        recipients: [a.to.id],
        actorId: a.actorId,
        actorName: a.actorName,
        nodeId: p.id,
        kind: 'project',
        title: p.name ?? '',
      });
      if (a.fromId != null) {
        await this.notifications.notify({
          type: 'project_transferred_away',
          recipients: [a.fromId],
          actorId: a.actorId,
          actorName: a.actorName,
          nodeId: p.id,
          kind: 'project',
          title: p.name ?? '',
        });
      }
    }
  }
}
