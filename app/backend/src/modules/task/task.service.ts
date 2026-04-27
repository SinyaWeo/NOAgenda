import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Task, TaskStatus } from './task.entity';

export interface TaskFilter {
  userId?: number;
  projectId?: number;
  parentTaskId?: number;
  status?: TaskStatus;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
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

    if (filter?.userId !== undefined) {
      // Scope to projects the user owns or has been given access to
      qb.leftJoin('project_users', 'pu', 'pu.projectId = project.id AND pu.userId = :userId', { userId: filter.userId })
        .andWhere('(project.ownerId = :userId OR pu.userId = :userId)', { userId: filter.userId });
    }

    if (filter?.projectId) {
      qb.andWhere('project.id = :projectId', { projectId: filter.projectId });
    }
    if (filter?.parentTaskId !== undefined) {
      qb.andWhere('task.parentTaskId = :parentTaskId', { parentTaskId: filter.parentTaskId });
    }
    if (filter?.status) {
      qb.andWhere('task.status = :status', { status: filter.status });
    }
    if (filter?.search) {
      qb.andWhere('(task.title LIKE :search OR task.description LIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    const sortField = filter?.sort === 'title' ? 'task.title'
      : filter?.sort === 'priority' ? 'task.priority'
      : filter?.sort === 'status' ? 'task.status'
      : filter?.sort === 'dueDate' ? 'task.dueDate'
      : 'task.position';
    const sortOrder = filter?.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortOrder).addOrderBy('task.createdAt', 'DESC');

    if (filter?.limit) {
      const page = filter.page ?? 1;
      qb.skip((page - 1) * filter.limit).take(filter.limit);
    }

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

  async duplicate(id: number, createdBy?: number): Promise<Task | null> {
    const original = await this.findById(id);
    if (!original) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...data } = original as any;
    return this.create({ ...data, title: `${original.title} (copy)`, createdBy });
  }

  async updatePosition(id: number, position: number): Promise<Task | null> {
    await this.taskRepository.update(id, { position } as any);
    return this.findById(id);
  }

  async bulkUpdate(ids: number[], data: Partial<Task>, userId?: number): Promise<Task[]> {
    const qb = this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set(data)
      .whereInIds(ids);
    if (userId !== undefined) {
      qb.andWhere('createdBy = :userId', { userId });
    }
    await qb.execute();
    return this.taskRepository.findByIds(ids);
  }

  async remove(id: number): Promise<void> {
    await this.taskRepository.delete(id);
  }
}
