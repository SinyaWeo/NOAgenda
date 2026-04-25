import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLabel } from './task-label.entity';

@Injectable()
export class TaskLabelService {
  constructor(
    @InjectRepository(TaskLabel)
    private readonly repo: Repository<TaskLabel>,
  ) {}

  async findByTask(taskId: number): Promise<TaskLabel[]> {
    return this.repo.find({ where: { task: { id: taskId } }, relations: ['label', 'task'] });
  }

  async add(taskId: number, labelId: number): Promise<TaskLabel> {
    const taskLabel = this.repo.create({ task: { id: taskId } as any, label: { id: labelId } as any });
    return this.repo.save(taskLabel);
  }

  async remove(taskId: number, labelId: number): Promise<void> {
    await this.repo.delete({ task: { id: taskId }, label: { id: labelId } });
  }
}
