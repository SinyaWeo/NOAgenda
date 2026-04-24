import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Project } from './project.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(): Promise<Project[]> {
    return this.projectService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Project | null> {
    return this.projectService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Project>): Promise<Project> {
    return this.projectService.create(body);
  }
}
