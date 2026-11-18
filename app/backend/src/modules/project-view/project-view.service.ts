import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectView, ViewType } from './project-view.entity';

@Injectable()
export class ProjectViewService {
  constructor(
    @InjectRepository(ProjectView)
    private readonly repo: Repository<ProjectView>,
  ) {}

  async findByProject(projectId: number): Promise<ProjectView[]> {
    return this.repo.find({ where: { project: { id: projectId } }, relations: { project: true } });
  }

  async findById(id: number): Promise<ProjectView | null> {
    return this.repo.findOne({ where: { id }, relations: { project: true } });
  }

  async create(projectId: number, title: string, viewType: ViewType = ViewType.LIST): Promise<ProjectView> {
    const view = this.repo.create({ project: { id: projectId }, title, viewType });
    return this.repo.save(view);
  }

  async update(id: number, data: Partial<ProjectView>): Promise<ProjectView | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
