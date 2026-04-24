import { Repository } from 'typeorm';
import { Task } from './task.entity';
export declare class TaskService {
    private readonly taskRepository;
    constructor(taskRepository: Repository<Task>);
    findAll(): Promise<Task[]>;
    findById(id: number): Promise<Task | null>;
    create(task: Partial<Task>): Promise<Task>;
}
