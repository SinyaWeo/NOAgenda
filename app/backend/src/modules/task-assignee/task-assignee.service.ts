import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAssignee } from './task-assignee.entity';
import { orConflict } from '../../common/db-errors';

@Injectable()
export class TaskAssigneeService {
  constructor(
    @InjectRepository(TaskAssignee)
    private readonly repo: Repository<TaskAssignee>,
  ) {}

  async findByTask(taskId: number): Promise<TaskAssignee[]> {
    return this.repo.find({ where: { node: { id: taskId } }, relations: { user: true, node: true } });
  }

  async add(taskId: number, userId: number): Promise<TaskAssignee> {
    const assignee = this.repo.create({ node: { id: taskId }, user: { id: userId } });
    return orConflict(this.repo.save(assignee), 'This user is already assigned to the task');
  }

  async remove(taskId: number, userId: number): Promise<void> {
    await this.repo.delete({ node: { id: taskId }, user: { id: userId } });
  }
}
