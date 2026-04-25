import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectViewService } from './project-view.service';
import { ProjectView, ViewType } from './project-view.entity';

@Controller('projects/:projectId/views')
export class ProjectViewController {
  constructor(private readonly projectViewService: ProjectViewService) {}

  @Get()
  async findAll(@Param('projectId') projectId: number): Promise<ProjectView[]> {
    return this.projectViewService.findByProject(projectId);
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<ProjectView> {
    const view = await this.projectViewService.findById(id);
    if (!view) throw new NotFoundException();
    return view;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('projectId') projectId: number,
    @Body() body: { title: string; type?: ViewType },
  ): Promise<ProjectView> {
    return this.projectViewService.create(projectId, body.title, body.type);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<ProjectView>): Promise<ProjectView> {
    const view = await this.projectViewService.update(id, body);
    if (!view) throw new NotFoundException();
    return view;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.projectViewService.remove(id);
  }
}
