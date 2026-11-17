import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { TaskReminder } from './task-reminder.entity';
import { NodeStatus } from '../node/node.entity';
import { NotificationService } from '../notification/notification.service';
import { TaskAssigneeService } from '../task-assignee/task-assignee.service';

const CHECK_INTERVAL_MS = 30 * 1000;
const BATCH = 100;

@Injectable()
export class TaskReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskReminderService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @InjectRepository(TaskReminder)
    private readonly repo: Repository<TaskReminder>,
    private readonly notifications: NotificationService,
    private readonly assignees: TaskAssigneeService,
  ) {}

  onModuleInit() {
    const tick = () => this.sendDue().catch((e) => this.logger.warn(`Reminder check failed: ${(e as Error).message}`));
    void tick();
    this.timer = setInterval(tick, CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async findByTask(taskId: number): Promise<TaskReminder[]> {
    return this.repo.find({ where: { node: { id: taskId } }, relations: ['node'], order: { reminderDate: 'ASC' } });
  }

  async create(taskId: number, reminderDate: Date, createdBy?: number): Promise<TaskReminder> {
    const reminder = this.repo.create({ node: { id: taskId } as any, reminderDate, createdBy: createdBy ?? null });
    return this.repo.save(reminder);
  }

  /** Scoped to the task so a reminder id from another task can't be deleted. */
  async remove(taskId: number, id: number): Promise<void> {
    await this.repo.delete({ id, node: { id: taskId } as any });
  }

  /**
   * Notify for every reminder that is due. Each one is claimed with a conditional update first,
   * so it fires exactly once even with several server instances or overlapping runs.
   * Returns how many notifications were sent.
   */
  async sendDue(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const due = await this.repo.find({
        where: { sentAt: IsNull(), reminderDate: LessThanOrEqual(now) },
        relations: ['node'],
        order: { reminderDate: 'ASC' },
        take: BATCH,
      });
      let sent = 0;
      for (const reminder of due) {
        const claimed = await this.repo.update({ id: reminder.id, sentAt: IsNull() }, { sentAt: new Date() });
        if (claimed.affected !== 1) continue; // another run took it
        const task = reminder.node;
        // No point reminding about finished or archived work.
        if (!task || task.status === NodeStatus.DONE || task.isArchived) continue;
        const recipients =
          reminder.createdBy != null
            ? [reminder.createdBy]
            : [task.createdBy, ...(await this.assignees.findByTask(task.id)).map((a) => a.user?.id)];
        await this.notifications.notify({
          type: 'task_reminder',
          recipients,
          actorId: null,
          nodeId: task.id,
          kind: 'task',
          title: task.title ?? '',
        });
        sent++;
      }
      return sent;
    } finally {
      this.running = false;
    }
  }
}
