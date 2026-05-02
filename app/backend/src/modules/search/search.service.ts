import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Task } from '../task/task.entity';
import { Project } from '../project/project.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async search(q: string) {
    const term = `%${q}%`;
    const [tasks, projects] = await Promise.all([
      this.taskRepo.find({ where: { title: Like(term) }, take: 5 }),
      this.projectRepo.find({ where: { name: Like(term) }, take: 5 }),
    ]);
    return { tasks, projects };
  }
}
