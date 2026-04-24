import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find();
  }

  async findById(id: number): Promise<Project | null> {
    return this.projectRepository.findOne({ where: { id } });
  }

  async create(project: Partial<Project>): Promise<Project> {
    const newProject = this.projectRepository.create(project);
    return this.projectRepository.save(newProject);
  }
}
