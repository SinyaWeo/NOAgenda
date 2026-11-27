import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskRelation, RelationKind } from './task-relation.entity';
import { orConflict } from '../../common/db-errors';

/** The relation kinds that order two tasks in time. */
export const DEPENDENCY_KINDS = [RelationKind.BLOCKS, RelationKind.BLOCKED_BY];
/** Safety cap for the cycle walk (tasks visited). */
const MAX_WALK = 10000;

/** "from must finish before to" for a dependency row; null for other kinds. */
export function dependencyEdge(
  taskId: number,
  relatedTaskId: number,
  kind: RelationKind,
): { fromId: number; toId: number } | null {
  if (kind === RelationKind.BLOCKS) return { fromId: taskId, toId: relatedTaskId };
  if (kind === RelationKind.BLOCKED_BY) return { fromId: relatedTaskId, toId: taskId };
  return null;
}

@Injectable()
export class TaskRelationService {
  constructor(
    @InjectRepository(TaskRelation)
    private readonly repo: Repository<TaskRelation>,
  ) {}

  async findByTask(taskId: number): Promise<TaskRelation[]> {
    return this.repo.find({
      where: [{ node: { id: taskId } }, { relatedNode: { id: taskId } }],
      relations: { node: true, relatedNode: true },
    });
  }

  async create(taskId: number, relatedTaskId: number, kind: RelationKind): Promise<TaskRelation> {
    const relation = this.repo.create({
      node: { id: taskId },
      relatedNode: { id: relatedTaskId },
      kind,
    });
    return orConflict(this.repo.save(relation), 'These tasks are already related that way');
  }

  /** `blocks` / `blocked_by` relations with at least one of their two tasks among `ids`. */
  async dependenciesTouching(ids: number[]): Promise<TaskRelation[]> {
    if (!ids.length) return [];
    return this.repo.find({
      where: [
        { node: { id: In(ids) }, kind: In(DEPENDENCY_KINDS) },
        { relatedNode: { id: In(ids) }, kind: In(DEPENDENCY_KINDS) },
      ],
      relations: { node: true, relatedNode: true },
    });
  }

  /**
   * Would the dependency "`fromId` must finish before `toId`" close a loop? True when `fromId` can already be
   * reached from `toId` by following dependencies (either spelling: `blocks` or `blocked_by`).
   */
  async wouldCreateCycle(fromId: number, toId: number): Promise<boolean> {
    if (fromId === toId) return true;
    const seen = new Set<number>([toId]);
    let frontier = [toId];
    while (frontier.length && seen.size < MAX_WALK) {
      const rows = await this.repo.find({
        where: [
          { node: { id: In(frontier) }, kind: RelationKind.BLOCKS },
          { relatedNode: { id: In(frontier) }, kind: RelationKind.BLOCKED_BY },
        ],
        relations: { node: true, relatedNode: true },
      });
      const next: number[] = [];
      for (const r of rows) {
        const after = r.kind === RelationKind.BLOCKS ? r.relatedNode?.id : r.node?.id;
        if (after == null) continue;
        if (after === fromId) return true;
        if (!seen.has(after)) {
          seen.add(after);
          next.push(after);
        }
      }
      frontier = next;
    }
    return false;
  }

  async remove(taskId: number, relatedTaskId: number, kind: RelationKind): Promise<void> {
    await this.repo.delete({ node: { id: taskId }, relatedNode: { id: relatedTaskId }, kind });
  }
}
