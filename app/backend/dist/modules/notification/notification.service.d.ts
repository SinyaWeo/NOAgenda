import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
export declare class NotificationService {
    private readonly notificationRepository;
    constructor(notificationRepository: Repository<Notification>);
    findAll(): Promise<Notification[]>;
    findById(id: number): Promise<Notification | null>;
    create(notification: Partial<Notification>): Promise<Notification>;
}
