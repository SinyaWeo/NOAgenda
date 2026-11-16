import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Node } from '../node/node.entity';
import { Access, NodeAccessService } from '../node/node-access.service';
import { normalizeParentRefs } from '../node/node-payload';
import { ProjectCreateDto, ProjectUpdateDto } from '../node/dto/node.dto';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<Node[]> {
    return this.projectService.findAll(req.user.userId, includeArchived === 'true');
  }

  @Get('stats')
  async getStats(@Request() req: any): Promise<Record<number, { total: number; done: number }>> {
    const projects = await this.projectService.findAll(req.user.userId);
    const ids = projects.map((p) => p.id);
    return this.projectService.getTaskStats(ids);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.access.assertProject(req.user.userId, Number(id), Access.READ);
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    return project;
  }

  @Post()
  async create(@Body() body: ProjectCreateDto, @Request() req: any): Promise<Node> {
    // sanitize() strips id/ownerId/etc. so a client cannot overwrite someone else's node.
    const data = normalizeParentRefs(this.access.sanitize(body));
    delete (data as any).type;
    await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
    return this.projectService.create({ ...data, ownerId: req.user.userId });
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: ProjectUpdateDto, @Request() req: any): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    // Prevent mass-assignment of ownership/identity fields
    const safeBody = normalizeParentRefs(this.access.sanitize(body));
    delete (safeBody as any).type;
    if (safeBody.parentId !== undefined && safeBody.parentId !== project.parentId) {
      await this.access.assertCanUseAsParent(req.user.userId, safeBody.parentId, project.id);
    }
    const updated = await this.projectService.update(id, safeBody);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Put(':id/duplicate')
  async duplicate(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.access.assertProject(req.user.userId, Number(id), Access.READ);
    const source = await this.projectService.findById(id);
    if (!source) throw new NotFoundException();
    // The copy lands under the same parent, so the caller must be allowed to put things there.
    await this.access.assertCanUseAsParent(req.user.userId, source.parentId);
    const project = await this.projectService.duplicate(id, req.user.userId);
    if (!project) throw new NotFoundException();
    return project;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.projectService.remove(id);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    const updated = await this.projectService.archive(id);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Patch(':id/unarchive')
  async unarchive(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    const updated = await this.projectService.unarchive(id);
    if (!updated) throw new NotFoundException();
    return updated;
  }
}
