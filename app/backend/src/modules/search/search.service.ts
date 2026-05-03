import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Node } from '../node/node.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Node) private readonly nodeRepo: Repository<Node>,
  ) {}

  async search(q: string) {
    const term = `%${q}%`;
    const results = await this.nodeRepo.find({
      where: [
        { title: Like(term) },
        { name: Like(term) },
      ],
      take: 10,
    });
    const tasks = results.filter((n) => n.type === 'task');
    const projects = results.filter((n) => n.type === 'project');
    return { tasks, projects };
  }
}
