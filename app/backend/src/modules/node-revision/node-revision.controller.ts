import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Request } from '@nestjs/common';
import { NodeAccessService } from '../node/node-access.service';
import { NodeService } from '../node/node.service';
import { Node } from '../node/node.entity';
import { NodeRevisionService, RevisionPage } from './node-revision.service';
import { RevisionQueryDto } from './dto/node-revision.dto';

@Controller('node-revisions')
export class NodeRevisionController {
  constructor(
    private readonly revisions: NodeRevisionService,
    private readonly nodes: NodeService,
    private readonly access: NodeAccessService,
  ) {}

  /** Saved titles and descriptions of a task or project you can read, newest first. */
  @Get()
  async list(@Query() q: RevisionQueryDto, @Request() req: AuthRequest): Promise<RevisionPage> {
    await this.access.assertRead(req.user.userId, q.nodeId);
    return this.revisions.list(q.nodeId, q.before, q.limit);
  }

  /** Put a revision's title and description back on its node (recorded as a new revision and audit entry). */
  @Post(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest): Promise<Node> {
    const revision = await this.revisions.findById(id);
    if (!revision) throw new NotFoundException();
    const node = await this.nodes.findById(revision.nodeId);
    if (!node) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, node);
    const patch: Partial<Node> = { description: revision.description ?? '' };
    if (revision.title) patch.title = revision.title;
    const updated = await this.nodes.update(node.id, patch, req.user.userId);
    if (!updated) throw new NotFoundException();
    return updated;
  }
}
