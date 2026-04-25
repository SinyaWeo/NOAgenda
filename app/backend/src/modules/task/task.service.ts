import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Task, TaskStatus } from './task.entity';

export interface TaskFilter {
  projectId?: number;
  status?: TaskStatus;
  search?: string;
}

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async findAll(filter?: TaskFilter): Promise<Task[]> {
    const qb = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project');

    if (filter?.projectId) {
      qb.andWhere('project.id = :projectId', { projectId: filter.projectId });
    }
    if (filter?.status) {
      qb.andWhere('task.status = :status', { status: filter.status });
    }
    if (filter?.search) {
      qb.andWhere('(task.title LIKE :search OR task.description LIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    qb.orderBy('task.position', 'ASC').addOrderBy('task.createdAt', 'DESC');
    return qb.getMany();
  }

  async findById(id: number): Promise<Task | null> {
    return this.taskRepository.findOne({ where: { id }, relations: ['project'] });
  }

  async create(task: Partial<Task>): Promise<Task> {
    const newTask = this.taskRepository.create(task);
    return this.taskRepository.save(newTask);
  }

  async update(id: number, data: Partial<Task>): Promise<Task | null> {
    await this.taskRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.taskRepository.delete(id);
  }
}
