import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  TaskCreateDto,
  TaskUpdateDto,
  NodeListQueryDto,
  TaskListQueryDto,
  BulkTaskUpdateDto,
  NodeMoveDto,
  ProjectCreateDto,
} from '../dto/node.dto';
import { normalizeParentRefs } from '../node-payload';

// Same settings as main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: any): ArgumentMetadata => ({ type: 'body', metatype });
const query = (metatype: any): ArgumentMetadata => ({ type: 'query', metatype });
const rejects = (v: any, m: ArgumentMetadata) =>
  expect(pipe.transform(v, m)).rejects.toBeInstanceOf(BadRequestException);

describe('task/project DTOs', () => {
  it('accepts what the UI really sends', async () => {
    await expect(
      pipe.transform(
        { title: 'T', description: 'd', project: { id: 3 }, dueDate: '2030-01-01T00:00:00.000Z', priority: 2 },
        body(TaskCreateDto),
      ),
    ).resolves.toBeDefined();
    await expect(
      pipe.transform({ title: 'T', parentTaskId: 4, project: { id: 3 } }, body(TaskCreateDto)),
    ).resolves.toBeDefined();
    await expect(
      pipe.transform(
        { title: 'T', dueDate: null, startDate: null, repeatAfter: null, repeatMode: null, percentDone: 50 },
        body(TaskUpdateDto),
      ),
    ).resolves.toBeDefined();
    await expect(pipe.transform({ status: 'done' }, body(TaskUpdateDto))).resolves.toBeDefined();
    await expect(pipe.transform({ name: 'P', description: 'x' }, body(ProjectCreateDto))).resolves.toBeDefined();
  });

  it.each([
    ['missing title', {}],
    ['empty title', { title: '' }],
    ['title too long', { title: 'x'.repeat(256) }],
    ['bad status', { title: 't', status: 'x' }],
    ['bad date', { title: 't', dueDate: 'tomorrow' }],
    ['priority range', { title: 't', priority: 11 }],
    ['percent range', { title: 't', percentDone: 101 }],
    ['ownership fields', { title: 't', createdBy: 1 }],
    ['identity fields', { title: 't', id: 1 }],
    ['wrong type', { title: 't', description: 5 }],
  ])('rejects a task with %s', async (_n, v) => rejects(v, body(TaskCreateDto)));

  it('rejects a project without a name and a bulk update with too many ids', async () => {
    await rejects({}, body(ProjectCreateDto));
    await rejects(
      { ids: Array.from({ length: 201 }, (_, i) => i + 1), data: { status: 'done' } },
      body(BulkTaskUpdateDto),
    );
    await rejects({ ids: [], data: {} }, body(BulkTaskUpdateDto));
    await rejects({ ids: [1], data: { createdBy: 2 } }, body(BulkTaskUpdateDto));
  });

  it('allows moving to the top level (null) but not to a bad id', async () => {
    await expect(pipe.transform({ parentId: null }, body(NodeMoveDto))).resolves.toBeDefined();
    await rejects({ parentId: 'abc' }, body(NodeMoveDto));
  });
});

describe('list query DTOs', () => {
  it('converts and bounds paging', async () => {
    const q: any = await pipe.transform(
      { limit: '50', page: '2', order: 'desc', sort: 'priority', status: 'open' },
      query(TaskListQueryDto),
    );
    expect(q).toMatchObject({ limit: 50, page: 2, order: 'DESC', sort: 'priority' });
    // every sort the tasks page offers must be accepted (it builds this query dynamically)
    for (const sort of ['createdAt', 'dueDate', 'priority', 'title', 'status']) {
      await expect(
        pipe.transform({ sort, order: 'ASC', page: '1', limit: '21' }, query(TaskListQueryDto)),
      ).resolves.toBeDefined();
    }
    await rejects({ limit: '501' }, query(TaskListQueryDto));
    await rejects({ limit: '0' }, query(TaskListQueryDto));
    await rejects({ limit: 'abc' }, query(TaskListQueryDto));
    await rejects({ page: '-1' }, query(TaskListQueryDto));
  });

  it('only allows whitelisted sort fields, types and parent ids', async () => {
    await rejects({ sort: 'password' }, query(TaskListQueryDto));
    await rejects({ type: 'folder' }, query(NodeListQueryDto));
    await rejects({ parentId: '1; DROP TABLE nodes' }, query(NodeListQueryDto));
    await expect(
      pipe.transform({ parentId: 'null', type: 'project', includeArchived: 'true' }, query(NodeListQueryDto)),
    ).resolves.toBeDefined();
  });
});

describe('normalizeParentRefs', () => {
  it('prefers the parent task over the project when both are given', () => {
    expect(normalizeParentRefs({ title: 's', parentTaskId: 7, project: { id: 2 } }).parentId).toBe(7);
    expect(normalizeParentRefs({ parentTask: { id: 8 }, projectId: 2 }).parentId).toBe(8);
  });
  it('falls back to the project and drops the legacy keys', () => {
    const out = normalizeParentRefs({ title: 't', project: { id: 2 } });
    expect(out.parentId).toBe(2);
    expect(out).not.toHaveProperty('project');
    expect(normalizeParentRefs({ projectId: 5 }).parentId).toBe(5);
  });
  it('keeps an explicit parentId', () => {
    expect(normalizeParentRefs({ parentId: 9, project: { id: 2 } }).parentId).toBe(9);
  });
});
