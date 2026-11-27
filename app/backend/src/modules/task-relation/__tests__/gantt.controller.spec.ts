import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GanttController } from '../gantt.controller';
import { GanttQueryDto } from '../dto/gantt.dto';
import { RelationKind } from '../task-relation.entity';
import type { TaskRelationService } from '../task-relation.service';
import { Access, type NodeAccessService } from '../../node/node-access.service';
import { asMock, authReq } from '../../../common/__tests__/test-utils';

const rel = (a: number, kind: RelationKind, b: number) => ({ node: { id: a }, relatedNode: { id: b }, kind });

function build(levels: Record<number, Access>, rows: ReturnType<typeof rel>[]) {
  const relations = { dependenciesAmong: jest.fn(async () => rows) };
  const access = {
    levels: jest.fn(async (_u: number, ids: number[]) => new Map(ids.map((id) => [id, levels[id] ?? Access.NONE]))),
  };
  return {
    ctrl: new GanttController(asMock<TaskRelationService>(relations), asMock<NodeAccessService>(access)),
    relations,
    access,
  };
}

describe('GanttController', () => {
  it('returns one arrow per ordered pair, whichever way it is stored, with the rows behind it', async () => {
    const { ctrl } = build({ 1: Access.WRITE, 2: Access.WRITE, 3: Access.READ }, [
      rel(1, RelationKind.BLOCKS, 2),
      rel(2, RelationKind.BLOCKED_BY, 1), // the same dependency, other spelling
      rel(3, RelationKind.BLOCKED_BY, 2), // 2 -> 3
    ]);
    const res = await ctrl.get({ taskIds: [1, 2, 3] }, authReq(5));
    expect(res.dependencies).toEqual([
      {
        fromId: 1,
        toId: 2,
        rows: [
          { taskId: 1, kind: RelationKind.BLOCKS, relatedTaskId: 2 },
          { taskId: 2, kind: RelationKind.BLOCKED_BY, relatedTaskId: 1 },
        ],
      },
      { fromId: 2, toId: 3, rows: [{ taskId: 3, kind: RelationKind.BLOCKED_BY, relatedTaskId: 2 }] },
    ]);
    expect(res.editable).toEqual([1, 2]);
  });

  it('only looks at tasks the caller can read, and edits only those it can write', async () => {
    const { ctrl, relations, access } = build({ 1: Access.READ, 2: Access.ADMIN, 3: Access.NONE }, []);
    const res = await ctrl.get({ taskIds: [1, 2, 3] }, authReq(5));
    expect(access.levels).toHaveBeenCalledWith(5, [1, 2, 3]);
    expect(relations.dependenciesAmong).toHaveBeenCalledWith([1, 2]);
    expect(res).toEqual({ dependencies: [], editable: [2] });
  });

  it('skips rows whose task is gone', async () => {
    const { ctrl } = build({ 1: Access.READ, 2: Access.READ }, [
      { node: { id: 1 }, relatedNode: undefined, kind: RelationKind.BLOCKS } as never,
    ]);
    expect((await ctrl.get({ taskIds: [1, 2] }, authReq(5))).dependencies).toEqual([]);
  });
});

describe('GanttQueryDto', () => {
  const check = async (taskIds: string) =>
    (await validate(plainToInstance(GanttQueryDto, { taskIds }))).map((e) => e.property);

  it('parses a comma-separated id list', async () => {
    expect(plainToInstance(GanttQueryDto, { taskIds: '1, 2,3' }).taskIds).toEqual([1, 2, 3]);
    expect(await check('1,2,3')).toEqual([]);
  });

  it('rejects junk, zero, empty items and more than 500 ids', async () => {
    for (const bad of ['a,b', '0', '1,,2', '', Array.from({ length: 501 }, (_, i) => i + 1).join(',')]) {
      expect(await check(bad)).toEqual(['taskIds']);
    }
  });
});
