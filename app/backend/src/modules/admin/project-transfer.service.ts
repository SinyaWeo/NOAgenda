import { Injectable } from '@nestjs/common';
import { DomainEvents } from '../../common/domain-events';
import { NotificationService } from '../notification/notification.service';
import type { TransferredProject } from '../account/account.service';

export interface TransferAnnouncement {
  /** Username of the previous owner (kept as text: the account may be gone). */
  fromName: string;
  to: { id: number; username: string };
  actorId: number;
  actorName: string;
}

/**
 * What follows a change of project owner once it is committed: one audit trail entry per project
 * (`project.owner_changed`, audit only, never sent to webhooks) and a notification to the new owner.
 */
@Injectable()
export class ProjectTransferService {
  constructor(
    private readonly events: DomainEvents,
    private readonly notifications: NotificationService,
  ) {}

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
        changes: { owner: { from: a.fromName, to: a.to.username } },
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
    }
  }
}
