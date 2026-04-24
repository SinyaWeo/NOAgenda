import { Repository } from 'typeorm';
import { Project } from './project.entity';
export declare class ProjectService {
    private readonly projectRepository;
    constructor(projectRepository: Repository<Project>);
    findAll(): Promise<Project[]>;
    findById(id: number): Promise<Project | null>;
    create(project: Partial<Project>): Promise<Project>;
}
