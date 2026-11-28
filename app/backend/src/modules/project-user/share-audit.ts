import type { DomainEvents } from '../../common/domain-events';
import type { NodeService } from '../node/node.service';
import type { Permission } from './project-user.entity';

/** Who a project grant is for, as the activity log keeps it (the name survives the account or team). */
export interface ShareTarget {
  type: 'user' | 'team';
  id: number;
  name: string | null;
}

/** The message a Manager gets when giving access to someone outside the project's teams. */
export const OUTSIDE_TEAM_SHARE = "Only the project owner can share it with people outside the project's teams";

/**
 * Record a change to who may see a project (`project.share_changed`, activity log only):
 * `from`/`to` are the permission before and after (null: no access).
 * `outsideTeam` marks a grant to a user who is in none of the project's teams.
 */
export async function auditShareChange(
  events: DomainEvents,
  nodes: Pick<NodeService, 'findById'>,
  change: {
    projectId: number;
    actorId: number;
    target: ShareTarget;
    from: Permission | null;
    to: Permission | null;
    outsideTeam?: boolean;
  },
): Promise<void> {
  let project: Awaited<ReturnType<NodeService['findById']>> = null;
  try {
    project = await nodes.findById(change.projectId);
  } catch {
    // the title is decoration: the change is still recorded
  }
  events.emit({
    name: 'project.share_changed',
    data: { projectId: change.projectId },
    nodeId: change.projectId,
    projectId: change.projectId,
    owner: project?.ownerId ?? null,
    actorId: change.actorId,
    title: project?.name ?? project?.title ?? null,
    changes: {
      share: { from: change.from, to: change.to },
      target: change.target,
      ...(change.outsideTeam ? { outsideTeam: true } : {}),
    },
    auditOnly: true,
  });
}
