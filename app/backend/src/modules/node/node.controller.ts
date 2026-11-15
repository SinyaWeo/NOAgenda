import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NodeService, NodeFilter } from './node.service';
import { NodeAccessService } from './node-access.service';
import { Node, NodeType, NodeStatus } from './node.entity';

@Controller('nodes')
@UseGuards(AuthGuard('jwt'))
export class NodeController {
  constructor(
    private readonly nodeService: NodeService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('type') type?: NodeType,
    @Query('parentId') parentId?: string,
    @Query('status') status?: NodeStatus,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<Node[]> {
    const filter: NodeFilter = { userId: req.user.userId };
    if (type) filter.type = type;
    if (parentId !== undefined) filter.parentId = parentId === 'null' ? null : Number(parentId);
    if (status) filter.status = status;
    if (search) filter.search = search;
    if (sort) filter.sort = sort;
    if (order) filter.order = order;
    if (page) filter.page = Number(page);
    if (limit) filter.limit = Number(limit);
    if (includeArchived === 'true') filter.includeArchived = true;
    return this.nodeService.findAll(filter);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: number, @Request() req: any): Promise<Node[]> {
    await this.access.assertRead(req.user.userId, Number(id));
    return this.nodeService.findChildren(Number(id));
  }

  @Get(':id/tree')
  async findTree(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.access.assertRead(req.user.userId, Number(id));
    const tree = await this.nodeService.findTree(Number(id));
    if (!tree) throw new NotFoundException();
    return tree;
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.access.assertRead(req.user.userId, Number(id));
    const node = await this.nodeService.findById(Number(id));
    if (!node) throw new NotFoundException();
    return node;
  }

  @Post()
  async create(@Body() body: Partial<Node>, @Request() req: any): Promise<Node> {
    if (body.type !== NodeType.PROJECT && body.type !== NodeType.TASK) {
      throw new BadRequestException('type must be "project" or "task"');
    }
    await this.access.assertCanUseAsParent(req.user.userId, body.parentId);
    const data: Partial<Node> = this.access.sanitize(body);
    if (body.type === NodeType.PROJECT) {
      data.ownerId = req.user.userId;
    } else {
      data.createdBy = req.user.userId;
    }
    return this.nodeService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: Partial<Node>, @Request() req: any): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    const safeBody: Partial<Node> = this.access.sanitize(body);
    delete (safeBody as any).type; // a node's type is immutable
    if (safeBody.parentId !== undefined && safeBody.parentId !== existing.parentId) {
      await this.access.assertCanUseAsParent(req.user.userId, safeBody.parentId);
    }
    const node = await this.nodeService.update(Number(id), safeBody);
    if (!node) throw new NotFoundException();
    return node;
  }

  @Put(':id/duplicate')
  async duplicate(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const source = await this.nodeService.findById(Number(id));
    if (!source) throw new NotFoundException();
    // A copy of a task lands in the same project, so it needs write access there.
    if (source.type === NodeType.PROJECT) await this.access.assertRead(req.user.userId, source.id);
    else await this.access.assertWrite(req.user.userId, source.id);
    const node = await this.nodeService.duplicate(Number(id), req.user.userId);
    if (!node) throw new NotFoundException();
    return node;
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: number,
    @Body() body: { parentId: number | null },
    @Request() req: any,
  ): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    await this.access.assertCanUseAsParent(req.user.userId, body.parentId);
    const node = await this.nodeService.move(Number(id), body.parentId);
    if (!node) throw new NotFoundException();
    return node;
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    const node = await this.nodeService.archive(Number(id));
    if (!node) throw new NotFoundException();
    return node;
  }

  @Patch(':id/unarchive')
  async unarchive(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    const node = await this.nodeService.unarchive(Number(id));
    if (!node) throw new NotFoundException();
    return node;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    return this.nodeService.remove(Number(id));
  }
}
