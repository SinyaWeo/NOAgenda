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
    return this.repo.find({ where: { task: { id: taskId } }, relations: ['task'] });
  }

  async create(taskId: number, reminderDate: Date): Promise<TaskReminder> {
    const reminder = this.repo.create({ task: { id: taskId } as any, reminderDate });
    return this.repo.save(reminder);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
