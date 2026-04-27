import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findAll(userId: number, includeArchived = false): Promise<Project[]> {
    // Return projects owned by the user OR shared via project_users
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project_users', 'pu', 'pu.projectId = project.id AND pu.userId = :userId', { userId })
      .where('(project.ownerId = :userId OR pu.userId = :userId)', { userId });
    if (!includeArchived) {
      qb.andWhere('project.isArchived = false');
    }
    return qb.getMany();
  }

  async findById(id: number): Promise<Project | null> {
    return this.projectRepository.findOne({ where: { id } });
  }

  async create(project: Partial<Project>): Promise<Project> {
    const newProject = this.projectRepository.create(project);
    return this.projectRepository.save(newProject);
  }

  async update(id: number, data: Partial<Project>): Promise<Project | null> {
    await this.projectRepository.update(id, data);
    return this.findById(id);
  }

  async duplicate(id: number, ownerId: number): Promise<Project | null> {
    const original = await this.findById(id);
    if (!original) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...data } = original as any;
    return this.create({ ...data, name: `${original.name} (copy)`, ownerId });
  }

  async remove(id: number): Promise<void> {
    await this.projectRepository.delete(id);
  }

  async archive(id: number): Promise<Project | null> {
    await this.projectRepository.update(id, { isArchived: true });
    return this.findById(id);
  }

  async unarchive(id: number): Promise<Project | null> {
    await this.projectRepository.update(id, { isArchived: false });
    return this.findById(id);
  }
}
