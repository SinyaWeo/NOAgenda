import type { AuthRequest } from '../../common/auth-user';
import { BadRequestException, Controller, Get, Query, Request } from '@nestjs/common';
import { Access, NodeAccessService } from '../node/node-access.service';
import { ActivityPage, ActivityService } from './activity.service';
import { ActivityQueryDto } from './dto/activity.dto';

@Controller('activity')
export class ActivityController {
  constructor(
    private readonly activity: ActivityService,
    private readonly access: NodeAccessService,
  ) {}

  /** Exactly one of `nodeId` (a task or project you can read), `projectId` (a project you can read) or `scope=mine`. */
  @Get()
  async list(@Query() q: ActivityQueryDto, @Request() req: AuthRequest): Promise<ActivityPage> {
    const chosen = [q.nodeId, q.projectId, q.scope].filter((v) => v !== undefined).length;
    if (chosen !== 1) throw new BadRequestException('Give exactly one of nodeId, projectId or scope=mine');
    if (q.nodeId) {
      await this.access.assertRead(req.user.userId, q.nodeId);
      return this.activity.forNode(q.nodeId, q.before, q.limit);
    }
    if (q.projectId) {
      await this.access.assertProject(req.user.userId, q.projectId, Access.READ);
      return this.activity.forProject(q.projectId, q.before, q.limit);
    }
    return this.activity.mine(req.user.userId, q.before, q.limit);
  }
}
