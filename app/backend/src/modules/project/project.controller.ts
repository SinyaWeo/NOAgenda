import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Node } from '../node/node.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Request() req: any,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<Node[]> {
    return this.projectService.findAll(req.user.userId, includeArchived === 'true');
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  async getStats(@Request() req: any): Promise<Record<number, { total: number; done: number }>> {
    const projects = await this.projectService.findAll(req.user.userId);
    const ids = projects.map((p) => p.id);
    return this.projectService.getTaskStats(ids);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    // Verify the caller owns or is a member of this project
    const accessible = await this.projectService.findAll(req.user.userId);
    if (!accessible.some((p) => p.id === Number(id))) throw new ForbiddenException();
    return project;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Node>, @Request() req: any): Promise<Node> {
    return this.projectService.create({ ...body, ownerId: req.user.userId });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Node>, @Request() req: any): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    // Prevent mass-assignment of ownership/identity fields
    const { id: _id, ownerId: _o, ...safeBody } = body as any;
    const updated = await this.projectService.update(id, safeBody);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Put(':id/duplicate')
  @UseGuards(AuthGuard('jwt'))
  async duplicate(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const project = await this.projectService.duplicate(id, req.user.userId);
    if (!project) throw new NotFoundException();
    return project;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.projectService.remove(id);
  }

  @Patch(':id/archive')
  @UseGuards(AuthGuard('jwt'))
  async archive(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    const updated = await this.projectService.archive(id);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Patch(':id/unarchive')
  @UseGuards(AuthGuard('jwt'))
  async unarchive(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    const updated = await this.projectService.unarchive(id);
    if (!updated) throw new NotFoundException();
    return updated;
  }
}
