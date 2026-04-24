import { Project } from '../project/project.entity';
export declare class Task {
    id: number;
    title: string;
    description?: string;
    project: Project;
    createdAt: Date;
    updatedAt: Date;
}
