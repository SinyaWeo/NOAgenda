import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectUser, Permission } from './project-user.entity';

@Injectable()
export class ProjectUserService {
  constructor(
    @InjectRepository(ProjectUser)
    private readonly repo: Repository<ProjectUser>,
  ) {}

  async findByProject(projectId: number): Promise<ProjectUser[]> {
    return this.repo.find({ where: { project: { id: projectId } }, relations: ['user', 'project'] });
  }

  async add(projectId: number, userId: number, permission: Permission = Permission.READ): Promise<ProjectUser> {
    const entry = this.repo.create({
      project: { id: projectId } as any,
      user: { id: userId } as any,
      permission,
    });
    return this.repo.save(entry);
  }

  async update(projectId: number, userId: number, permission: Permission): Promise<void> {
    await this.repo.update({ project: { id: projectId }, user: { id: userId } }, { permission });
  }

  async remove(projectId: number, userId: number): Promise<void> {
    await this.repo.delete({ project: { id: projectId }, user: { id: userId } });
  }
}
