import { TaskService } from './task.service';
import { Task } from './task.entity';
export declare class TaskController {
    private readonly taskService;
    constructor(taskService: TaskService);
    findAll(): Promise<Task[]>;
    findById(id: number): Promise<Task | null>;
    create(body: Partial<Task>): Promise<Task>;
}
