import { ProjectService } from './project.service';
import { Project } from './project.entity';
export declare class ProjectController {
    private readonly projectService;
    constructor(projectService: ProjectService);
    findAll(): Promise<Project[]>;
    findById(id: number): Promise<Project | null>;
    create(body: Partial<Project>): Promise<Project>;
}
