import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    findAll(): Promise<Notification[]>;
    findById(id: number): Promise<Notification | null>;
    create(body: Partial<Notification>): Promise<Notification>;
}
