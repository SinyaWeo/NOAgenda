import type { AuthRequest } from '../../common/auth-user';
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
  NotFoundException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { NodeService, NodeFilter } from './node.service';
import { NodeAccessService } from './node-access.service';
import { normalizeParentRefs } from './node-payload';
import { NodeCreateDto, NodeUpdateDto, NodeMoveDto, NodeListQueryDto } from './dto/node.dto';
import { Node, NodeType } from './node.entity';

@Controller('nodes')
export class NodeController {
  constructor(
    private readonly nodeService: NodeService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(@Request() req: AuthRequest, @Query() q: NodeListQueryDto): Promise<Node[]> {
    const filter: NodeFilter = { userId: req.user.userId };
    if (q.type) filter.type = q.type;
    if (q.parentId !== undefined) filter.parentId = q.parentId === 'null' ? null : Number(q.parentId);
    if (q.status) filter.status = q.status;
    if (q.search) filter.search = q.search;
    if (q.sort) filter.sort = q.sort;
    if (q.order) filter.order = q.order;
    if (q.page) filter.page = q.page;
    if (q.limit) filter.limit = q.limit;
    if (q.includeArchived === 'true') filter.includeArchived = true;
    return this.nodeService.findAll(filter);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node[]> {
    await this.access.assertRead(req.user.userId, Number(id));
    return this.nodeService.findChildren(Number(id));
  }

  @Get(':id/tree')
  async findTree(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    await this.access.assertRead(req.user.userId, Number(id));
    const tree = await this.nodeService.findTree(Number(id));
    if (!tree) throw new NotFoundException();
    return tree;
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    await this.access.assertRead(req.user.userId, Number(id));
    const node = await this.nodeService.findById(Number(id));
    if (!node) throw new NotFoundException();
    return node;
  }

  @Post()
  async create(@Body() body: NodeCreateDto, @Request() req: AuthRequest): Promise<Node> {
    if (body.type !== NodeType.PROJECT && body.type !== NodeType.TASK) {
      throw new BadRequestException('type must be "project" or "task"');
    }
    const data: Partial<Node> = normalizeParentRefs(this.access.sanitize(body));
    await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
    if (body.type === NodeType.PROJECT) {
      data.ownerId = req.user.userId;
    } else {
      data.createdBy = req.user.userId;
    }
    return this.nodeService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: NodeUpdateDto, @Request() req: AuthRequest): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    const safeBody: Partial<Node> = normalizeParentRefs(this.access.sanitize(body));
    delete safeBody.type; // a node's type is immutable
    if (safeBody.parentId !== undefined && safeBody.parentId !== existing.parentId) {
      await this.access.assertCanUseAsParent(req.user.userId, safeBody.parentId, existing.id);
    }
    const node = await this.nodeService.update(Number(id), safeBody);
    if (!node) throw new NotFoundException();
    return node;
  }

  @Put(':id/duplicate')
  async duplicate(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    const source = await this.nodeService.findById(Number(id));
    if (!source) throw new NotFoundException();
    // A copy of a task lands in the same project, so it needs write access there.
    if (source.type === NodeType.PROJECT) await this.access.assertRead(req.user.userId, source.id);
    else await this.access.assertWrite(req.user.userId, source.id);
    await this.access.assertCanUseAsParent(req.user.userId, source.parentId);
    const node = await this.nodeService.duplicate(Number(id), req.user.userId);
    if (!node) throw new NotFoundException();
    return node;
  }

  @Patch(':id/move')
  async move(@Param('id') id: number, @Body() body: NodeMoveDto, @Request() req: AuthRequest): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    await this.access.assertCanUseAsParent(req.user.userId, body.parentId, existing.id);
    const node = await this.nodeService.move(Number(id), body.parentId ?? null);
    if (!node) throw new NotFoundException();
    return node;
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    const node = await this.nodeService.archive(Number(id));
    if (!node) throw new NotFoundException();
    return node;
  }

  @Patch(':id/unarchive')
  async unarchive(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    const node = await this.nodeService.unarchive(Number(id));
    if (!node) throw new NotFoundException();
    return node;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const existing = await this.nodeService.findById(Number(id));
    if (!existing) throw new NotFoundException();
    await this.access.assertCanModify(req.user.userId, existing);
    return this.nodeService.remove(Number(id));
  }
}
