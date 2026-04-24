import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';
export declare class Attachment {
    id: number;
    filename: string;
    path: string;
    task: Task;
    uploader: User;
    createdAt: Date;
}
