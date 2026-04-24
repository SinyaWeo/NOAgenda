import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({ relations: ['user'] });
  }

  async findById(id: number): Promise<Notification | null> {
    return this.notificationRepository.findOne({ where: { id }, relations: ['user'] });
  }

  async create(notification: Partial<Notification>): Promise<Notification> {
    const newNotification = this.notificationRepository.create(notification);
    return this.notificationRepository.save(newNotification);
  }
}
