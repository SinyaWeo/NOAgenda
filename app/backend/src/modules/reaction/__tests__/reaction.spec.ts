import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReactionController } from '../reaction.controller';
import { ReactionService } from '../reaction.service';

const req = { user: { userId: 2 } };

describe('ReactionService', () => {
  let repo: any;
  let svc: ReactionService;
  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      delete: jest.fn(),
    };
    svc = new ReactionService(repo);
  });

  it('findAll filters by entity', async () => {
    await svc.findAll('task', 7);
    expect(repo.find).toHaveBeenCalledWith({ where: { entityType: 'task', entityId: 7 } });
  });

  it('upsert creates a reaction scoped to the user', async () => {
    await svc.upsert(2, 'task', 7, '👍');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { userId: 2, entityType: 'task', entityId: 7, reaction: '👍' },
    });
    expect(repo.create).toHaveBeenCalledWith({ userId: 2, entityType: 'task', entityId: 7, reaction: '👍' });
  });

  it('upsert is idempotent: reuses an existing reaction', async () => {
    const existing = { id: 3, userId: 2 };
    repo.findOne.mockResolvedValue(existing);
    await svc.upsert(2, 'task', 7, '👍');
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(existing);
  });

  it('remove deletes by id and throws NotFound when missing', async () => {
    repo.findOne.mockResolvedValue({ id: 4 });
    await svc.remove(2, 'task', 7, '👍');
    expect(repo.delete).toHaveBeenCalledWith(4);
    repo.findOne.mockResolvedValue(null);
    await expect(svc.remove(2, 'task', 7, '👍')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReactionController', () => {
  let service: any;
  let access: any;
  let controller: ReactionController;
  beforeEach(() => {
    service = { findAll: jest.fn(async () => []), upsert: jest.fn(async () => ({ id: 1 })), remove: jest.fn() };
    access = { assertRead: jest.fn() };
    controller = new ReactionController(service, access);
  });

  it('findAll asserts read and lists reactions', async () => {
    await controller.findAll('task', '7' as any, req);
    expect(access.assertRead).toHaveBeenCalledWith(2, 7);
    expect(service.findAll).toHaveBeenCalledWith('task', 7);
  });

  it.each([
    ['comment', 7],
    ['task', 'abc'],
    ['task', 0],
    ['task', 1.5],
    [undefined, 7],
  ])('findAll rejects entityType=%s entityId=%s', async (type, id) => {
    await expect(controller.findAll(type as any, id as any, req)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('findAll forbids reading reactions of unreadable entities', async () => {
    access.assertRead.mockRejectedValue(new ForbiddenException());
    await expect(controller.findAll('project', 7, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('upsert uses the requesting user, not a body-supplied one', async () => {
    await controller.upsert({ entityType: 'task', entityId: 7, reaction: '👍', userId: 99 } as any, req);
    expect(service.upsert).toHaveBeenCalledWith(2, 'task', 7, '👍');
  });

  it('upsert validates reaction (empty, blank, too long, non-string)', async () => {
    for (const reaction of ['', '   ', 'x'.repeat(101), 5 as any]) {
      await expect(controller.upsert({ entityType: 'task', entityId: 7, reaction }, req)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(service.upsert).not.toHaveBeenCalled();
  });

  it('upsert rejects a missing body', async () => {
    await expect(controller.upsert(undefined as any, req)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upsert asserts read access first', async () => {
    access.assertRead.mockRejectedValue(new ForbiddenException());
    await expect(controller.upsert({ entityType: 'task', entityId: 7, reaction: 'x' }, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.upsert).not.toHaveBeenCalled();
  });

  it('remove scopes to the requesting user and validates reaction', async () => {
    await controller.remove({ entityType: 'project', entityId: 7, reaction: 'x' }, req);
    expect(service.remove).toHaveBeenCalledWith(2, 'project', 7, 'x');
    await expect(controller.remove({ entityType: 'project', entityId: 7, reaction: ' ' }, req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
