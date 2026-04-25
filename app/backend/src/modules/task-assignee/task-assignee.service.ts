import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAssignee } from './task-assignee.entity';

@Injectable()
export class TaskAssigneeService {
  constructor(
    @InjectRepository(TaskAssignee)
    private readonly repo: Repository<TaskAssignee>,
  ) {}

  async findByTask(taskId: number): Promise<TaskAssignee[]> {
    return this.repo.find({ where: { task: { id: taskId } }, relations: ['user', 'task'] });
  }

  async add(taskId: number, userId: number): Promise<TaskAssignee> {
    const assignee = this.repo.create({ task: { id: taskId } as any, user: { id: userId } as any });
    return this.repo.save(assignee);
  }

  async remove(taskId: number, userId: number): Promise<void> {
    await this.repo.delete({ task: { id: taskId }, user: { id: userId } });
  }
}
