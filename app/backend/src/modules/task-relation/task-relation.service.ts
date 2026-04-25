import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskRelation, RelationKind } from './task-relation.entity';

@Injectable()
export class TaskRelationService {
  constructor(
    @InjectRepository(TaskRelation)
    private readonly repo: Repository<TaskRelation>,
  ) {}

  async findByTask(taskId: number): Promise<TaskRelation[]> {
    return this.repo.find({
      where: [{ task: { id: taskId } }, { relatedTask: { id: taskId } }],
      relations: ['task', 'relatedTask'],
    });
  }

  async create(taskId: number, relatedTaskId: number, kind: RelationKind): Promise<TaskRelation> {
    const relation = this.repo.create({
      task: { id: taskId } as any,
      relatedTask: { id: relatedTaskId } as any,
      kind,
    });
    return this.repo.save(relation);
  }

  async remove(taskId: number, relatedTaskId: number, kind: RelationKind): Promise<void> {
    await this.repo.delete({ task: { id: taskId }, relatedTask: { id: relatedTaskId }, kind });
  }
}
