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
    return this.repo.find({ where: { node: { id: taskId } }, relations: { label: true, node: true } });
  }

  async add(taskId: number, labelId: number): Promise<TaskLabel> {
    const taskLabel = this.repo.create({ node: { id: taskId }, label: { id: labelId } });
    return this.repo.save(taskLabel);
  }

  async remove(taskId: number, labelId: number): Promise<void> {
    await this.repo.delete({ node: { id: taskId }, label: { id: labelId } });
  }
}
