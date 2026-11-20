import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskCompletion } from './task-completion.entity';

export interface CompletionHistory {
  total: number;
  /** Consecutive most recent completions made on or before their due date. */
  streak: number;
  items: { id: number; completedAt: Date; dueDate: Date | null; completedBy: number | null }[];
}

const RECENT = 50;
const STREAK_WINDOW = 500;

@Injectable()
export class TaskCompletionService {
  constructor(@InjectRepository(TaskCompletion) private readonly repo: Repository<TaskCompletion>) {}

  async history(nodeId: number): Promise<CompletionHistory> {
    const [rows, total] = await this.repo.findAndCount({
      where: { node: { id: nodeId } },
      order: { completedAt: 'DESC', id: 'DESC' },
      take: Math.max(RECENT, STREAK_WINDOW),
    });
    return {
      total,
      streak: streakOf(rows),
      items: rows.slice(0, RECENT).map((r) => ({
        id: r.id,
        completedAt: r.completedAt,
        dueDate: r.dueDate ?? null,
        completedBy: r.completedBy ?? null,
      })),
    };
  }
}

/**
 * How many of the latest completions in a row were on time (rows newest first). A completion counts as
 * on time when it happened no later than the end of its due date's day; one without a due date counts too.
 */
export function streakOf(rows: Pick<TaskCompletion, 'completedAt' | 'dueDate'>[]): number {
  let streak = 0;
  for (const r of rows) {
    if (r.dueDate && new Date(r.completedAt).getTime() > new Date(r.dueDate).getTime() + 12 * 3600_000) break;
    streak++;
  }
  return streak;
}
