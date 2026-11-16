import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskReminder } from './task-reminder.entity';

@Injectable()
export class TaskReminderService {
  constructor(
    @InjectRepository(TaskReminder)
    private readonly repo: Repository<TaskReminder>,
  ) {}

  async findByTask(taskId: number): Promise<TaskReminder[]> {
    return this.repo.find({ where: { node: { id: taskId } }, relations: ['node'] });
  }

  async create(taskId: number, reminderDate: Date): Promise<TaskReminder> {
    const reminder = this.repo.create({ node: { id: taskId } as any, reminderDate });
    return this.repo.save(reminder);
  }

  /** Scoped to the task so a reminder id from another task can't be deleted. */
  async remove(taskId: number, id: number): Promise<void> {
    await this.repo.delete({ id, node: { id: taskId } as any });
  }
}
