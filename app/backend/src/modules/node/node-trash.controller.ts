import type { AuthRequest } from '../../common/auth-user';
import { Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Post, Request } from '@nestjs/common';
import { NodeAccessService } from './node-access.service';
import { Node } from './node.entity';
import { NodeService } from './node.service';
import { NodeTrashService, TrashEntry } from './node-trash.service';

@Controller('trash')
export class NodeTrashController {
  constructor(
    private readonly trash: NodeTrashService,
    private readonly nodes: NodeService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  list(@Request() req: AuthRequest): Promise<TrashEntry[]> {
    return this.trash.list(req.user.userId);
  }

  /** Bring a deleted task or project back, with what was deleted along with it. */
  @Post(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest): Promise<Node> {
    await this.assertMayManage(id, req.user.userId);
    return this.nodes.restore(id, req.user.userId);
  }

  /** Delete a trashed task or project for good. */
  @Delete(':id')
  async purge(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest): Promise<void> {
    const node = await this.assertMayManage(id, req.user.userId);
    await this.access.assertCanRemove(req.user.userId, node);
    await this.nodes.purge(id);
  }

  private async assertMayManage(id: number, userId: number): Promise<Node> {
    const node = await this.nodes.findTrashed(id);
    if (!node) throw new NotFoundException();
    await this.access.assertTrashed(userId, node);
    return node;
  }
}
