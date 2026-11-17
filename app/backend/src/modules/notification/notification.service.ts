import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { UserService } from '../user/user.service';
import { Translator } from '../../i18n/translator.service';

export interface NotifyEvent {
  type: NotificationType;
  /** Who should hear about it. Duplicates and the actor themself are dropped. */
  recipients: Array<number | null | undefined>;
  /** The person who did it; never notified about their own action. Null for system events (reminders). */
  actorId: number | null;
  actorName?: string;
  nodeId: number;
  kind: 'task' | 'project';
  title: string;
}

const clip = (v: string, n: number) => (v.length > n ? v.slice(0, n - 1) + '…' : v);

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly users: UserService,
    private readonly translator: Translator,
  ) {}

  async findAll(userId: number): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Notification | null> {
    return this.notificationRepository.findOne({ where: { id }, relations: ['user'] });
  }

  async create(notification: Partial<Notification>): Promise<Notification> {
    const newNotification = this.notificationRepository.create(notification);
    return this.notificationRepository.save(newNotification);
  }

  /**
   * Tell people about something that happened. Never throws and never blocks the action that
   * caused it: a failed notification must not fail an assignment or a comment.
   */
  async notify(event: NotifyEvent): Promise<void> {
    try {
      const ids = [...new Set(event.recipients.filter((id): id is number => typeof id === 'number'))].filter(
        (id) => id !== event.actorId,
      );
      if (!ids.length) return;
      const params = JSON.stringify({ actor: event.actorName ?? '', title: event.title, kind: event.kind });
      // The stored text is written in each recipient's own language: it is what an email, a push
      // message or a data export shows when they are not in the app. (The app itself words known
      // types from `params`, in whatever language is selected at that moment.)
      const languages = await this.users.languagesOf(ids);
      const args = { actor: clip(event.actorName ?? '', 60), title: clip(event.title, 120) };
      await this.notificationRepository.save(
        ids.map((id) =>
          this.notificationRepository.create({
            message: clip(this.translator.t(languages.get(id), `notification.${event.type}`, args), 255),
            type: event.type,
            nodeId: event.nodeId,
            params,
            user: { id } as any,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(`Could not create a ${event.type} notification: ${(err as Error).message}`);
    }
  }

  async markAsRead(id: number): Promise<Notification | null> {
    await this.notificationRepository.update(id, { read: true });
    return this.findById(id);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update({ user: { id: userId }, read: false }, { read: true });
  }

  async remove(id: number): Promise<void> {
    await this.notificationRepository.delete(id);
  }
}
