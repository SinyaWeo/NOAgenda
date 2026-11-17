import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FavoriteController } from '../favorite.controller';
import { FavoriteService } from '../favorite.service';
import { FavoriteEntityType } from '../favorite.entity';

const req = { user: { userId: 2 } };

describe('FavoriteService', () => {
  let repo: any;
  let svc: FavoriteService;
  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      delete: jest.fn(),
    };
    svc = new FavoriteService(repo);
  });

  it('findByUser scopes to the user', async () => {
    await svc.findByUser(2);
    expect(repo.find).toHaveBeenCalledWith({ where: { user: { id: 2 } }, relations: { user: true } });
  });

  it('add creates a favorite for the user', async () => {
    const res = await svc.add(2, FavoriteEntityType.TASK, 7);
    expect(repo.create).toHaveBeenCalledWith({ user: { id: 2 }, entityType: 'task', entityId: 7 });
    expect(res.id).toBe(1);
  });

  it('add is idempotent and returns the existing favorite', async () => {
    repo.findOne.mockResolvedValue({ id: 9 });
    await expect(svc.add(2, FavoriteEntityType.TASK, 7)).resolves.toEqual({ id: 9 });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('remove only deletes the caller own favorite', async () => {
    await svc.remove(2, FavoriteEntityType.PROJECT, 7);
    expect(repo.delete).toHaveBeenCalledWith({ user: { id: 2 }, entityType: 'project', entityId: 7 });
  });
});

describe('FavoriteController', () => {
  let service: any;
  let access: any;
  let controller: FavoriteController;
  beforeEach(() => {
    service = { findByUser: jest.fn(async () => []), add: jest.fn(async () => ({ id: 1 })), remove: jest.fn() };
    access = { assertRead: jest.fn() };
    controller = new FavoriteController(service, access);
  });

  it('findAll lists the requesting user favorites', async () => {
    await controller.findAll(req);
    expect(service.findByUser).toHaveBeenCalledWith(2);
  });

  it('add asserts read and adds with numeric id', async () => {
    await controller.add(req, { entityType: FavoriteEntityType.TASK, entityId: '7' as any });
    expect(access.assertRead).toHaveBeenCalledWith(2, 7);
    expect(service.add).toHaveBeenCalledWith(2, 'task', 7);
  });

  it('add rejects invalid entityType and missing body', async () => {
    await expect(controller.add(req, { entityType: 'user' as any, entityId: 7 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.add(req, undefined as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.add).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, 'abc', undefined])('add rejects invalid entityId %s', async (id) => {
    await expect(
      controller.add(req, { entityType: FavoriteEntityType.TASK, entityId: id as any }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('add refuses entities the user cannot read', async () => {
    access.assertRead.mockRejectedValue(new ForbiddenException());
    await expect(controller.add(req, { entityType: FavoriteEntityType.PROJECT, entityId: 7 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.add).not.toHaveBeenCalled();
  });

  it('remove is scoped to the requesting user', async () => {
    await controller.remove(req, FavoriteEntityType.TASK, '7' as any);
    expect(service.remove).toHaveBeenCalledWith(2, 'task', 7);
  });
});
