import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';
export declare class Comment {
    id: number;
    content: string;
    task: Task;
    author: User;
    createdAt: Date;
    updatedAt: Date;
}
