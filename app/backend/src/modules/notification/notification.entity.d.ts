import { User } from '../user/user.entity';
export declare class Notification {
    id: number;
    message: string;
    read: boolean;
    user: User;
    createdAt: Date;
}
