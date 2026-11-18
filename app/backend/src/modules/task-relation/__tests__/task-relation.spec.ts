import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { TaskRelationController } from '../task-relation.controller';
import { TaskRelationService } from '../task-relation.service';
import { RelationKind, TaskRelation } from '../task-relation.entity';
import { Access, NodeAccessService } from '../../node/node-access.service';
import { TaskService } from '../../task/task.service';
import { asMock, authReq, invalid, type Mocks } from '../../../common/__tests__/test-utils';

const req = authReq(2);

describe('TaskRelationController', () => {
  let service: Mocks;
  let tasks: Mocks;
  let access: Mocks;
  let controller: TaskRelationController;

  beforeEach(() => {
    service = { findByTask: jest.fn(async () => []), create: jest.fn(async () => ({ id: 1 })), remove: jest.fn() };
    tasks = { findById: jest.fn(async () => ({ id: 7 })) };
    access = { assertRead: jest.fn(), assertWrite: jest.fn(), level: jest.fn(async () => Access.READ) };
    controller = new TaskRelationController(
      asMock<TaskRelationService>(service),
      asMock<TaskService>(tasks),
      asMock<NodeAccessService>(access),
    );
  });

  it('findAll 404 on missing task', async () => {
    tasks.findById.mockResolvedValue(null);
    await expect(controller.findAll(7, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll asserts read on the task', async () => {
    await controller.findAll(7, req);
    expect(access.assertRead).toHaveBeenCalledWith(2, 7);
  });

  it('findAll hides relations whose other end the user cannot read', async () => {
    const rels = [
      { id: 1, node: { id: 7 }, relatedNode: { id: 8 } },
      { id: 2, node: { id: 9 }, relatedNode: { id: 7 } },
      { id: 3, node: { id: 7 }, relatedNode: { id: 10 } },
    ];
    service.findByTask.mockResolvedValue(rels);
    access.level.mockImplementation(async (_u: number, id: number) =>
      id === 8 ? Access.WRITE : id === 9 ? Access.READ : Access.NONE,
    );
    const res = await controller.findAll(7, req);
    expect(res.map((r) => r.id)).toEqual([1, 2]);
    expect(access.level).toHaveBeenCalledWith(2, 8);
    expect(access.level).toHaveBeenCalledWith(2, 9);
    expect(access.level).toHaveBeenCalledWith(2, 10);
  });

  it('findAll skips relations missing the other node', async () => {
    service.findByTask.mockResolvedValue([{ id: 1, node: { id: 7 } }]);
    await expect(controller.findAll(7, req)).resolves.toEqual([]);
  });

  it('refuses to relate a task to itself, before any lookup or write', async () => {
    await expect(controller.create(7, { relatedTaskId: 7, kind: RelationKind.RELATED }, req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      controller.create(invalid<number>('7'), { relatedTaskId: 7, kind: RelationKind.RELATED }, req),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('create asserts write on source and read on the related task', async () => {
    await controller.create(7, { relatedTaskId: 8, kind: RelationKind.BLOCKS }, req);
    expect(access.assertWrite).toHaveBeenCalledWith(2, 7);
    expect(access.assertRead).toHaveBeenCalledWith(2, 8);
    expect(service.create).toHaveBeenCalledWith(7, 8, RelationKind.BLOCKS);
  });

  it('create refuses to link to a task the user cannot read', async () => {
    access.assertRead.mockRejectedValue(new ForbiddenException());
    await expect(controller.create(7, { relatedTaskId: 8, kind: RelationKind.RELATED }, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it('create refuses when write is denied', async () => {
    access.assertWrite.mockRejectedValue(new ForbiddenException());
    await expect(controller.create(7, { relatedTaskId: 8, kind: RelationKind.RELATED }, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it('create 404 on missing task', async () => {
    tasks.findById.mockResolvedValue(null);
    await expect(controller.create(7, { relatedTaskId: 8, kind: RelationKind.RELATED }, req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove asserts write and passes kind and ids', async () => {
    await controller.remove(7, 8, RelationKind.BLOCKED_BY, req);
    expect(access.assertWrite).toHaveBeenCalledWith(2, 7);
    expect(service.remove).toHaveBeenCalledWith(7, 8, RelationKind.BLOCKED_BY);
  });

  it('remove blocked when write denied', async () => {
    access.assertWrite.mockRejectedValue(new ForbiddenException());
    await expect(controller.remove(7, 8, RelationKind.RELATED, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.remove).not.toHaveBeenCalled();
  });
});

describe('TaskRelationService', () => {
  let repo: Mocks;
  let svc: TaskRelationService;
  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      create: jest.fn((x: object) => x),
      save: jest.fn(async (x: object) => ({ id: 1, ...x })),
      delete: jest.fn(),
    };
    svc = new TaskRelationService(asMock<Repository<TaskRelation>>(repo));
  });

  it('findByTask matches either end of the relation', async () => {
    await svc.findByTask(7);
    expect(repo.find).toHaveBeenCalledWith({
      where: [{ node: { id: 7 } }, { relatedNode: { id: 7 } }],
      relations: { node: true, relatedNode: true },
    });
  });

  it('create saves node, related node and kind', async () => {
    await svc.create(7, 8, RelationKind.SUBTASK);
    expect(repo.create).toHaveBeenCalledWith({ node: { id: 7 }, relatedNode: { id: 8 }, kind: 'subtask' });
    expect(repo.save).toHaveBeenCalled();
  });

  it('remove deletes by exact node/related/kind', async () => {
    await svc.remove(7, 8, RelationKind.DUPLICATE_OF);
    expect(repo.delete).toHaveBeenCalledWith({ node: { id: 7 }, relatedNode: { id: 8 }, kind: 'duplicate_of' });
  });

  it('a duplicate relation is a 409, not a raw database error', async () => {
    repo.save.mockRejectedValue(
      Object.assign(new QueryFailedError('INSERT', [], new Error('dup')), { driverError: { code: 'ER_DUP_ENTRY' } }),
    );
    await expect(svc.create(7, 8, RelationKind.RELATED)).rejects.toBeInstanceOf(ConflictException);
  });
});
