import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionController } from '../subscription.controller';
import { SubscriptionService } from '../subscription.service';

const req = { user: { userId: 2 } };

describe('SubscriptionService', () => {
  let repo: any;
  let svc: SubscriptionService;
  beforeEach(() => {
    repo = {
      findOne: jest.fn(async () => null),
      find: jest.fn(async () => []),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      delete: jest.fn(),
    };
    svc = new SubscriptionService(repo);
  });

  it('subscribe creates a subscription for the user', async () => {
    const res = await svc.subscribe(2, 'task', 7);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: 2, entityType: 'task', entityId: 7 } });
    expect(res).toEqual({ id: 1, userId: 2, entityType: 'task', entityId: 7 });
  });

  it('subscribe throws ConflictException when already subscribed', async () => {
    repo.findOne.mockResolvedValue({ id: 5 });
    await expect(svc.subscribe(2, 'task', 7)).rejects.toThrow(new ConflictException('Already subscribed'));
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('unsubscribe deletes the existing subscription by id', async () => {
    repo.findOne.mockResolvedValue({ id: 5 });
    await svc.unsubscribe(2, 'project', 3);
    expect(repo.delete).toHaveBeenCalledWith(5);
  });

  it('unsubscribe throws NotFound when none exists', async () => {
    await expect(svc.unsubscribe(2, 'project', 3)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('findAll scopes to the user', async () => {
    await svc.findAll(2);
    expect(repo.find).toHaveBeenCalledWith({ where: { userId: 2 } });
  });
});

describe('SubscriptionController', () => {
  let service: any;
  let access: any;
  let controller: SubscriptionController;
  beforeEach(() => {
    service = { findAll: jest.fn(async () => []), subscribe: jest.fn(async () => ({ id: 1 })), unsubscribe: jest.fn() };
    access = { assertRead: jest.fn() };
    controller = new SubscriptionController(service, access);
  });

  it('findAll lists only the requesting user subscriptions', async () => {
    await controller.findAll(req);
    expect(service.findAll).toHaveBeenCalledWith(2);
  });

  it('subscribe asserts read then subscribes with numeric id', async () => {
    await controller.subscribe('task', '7' as any, req);
    expect(access.assertRead).toHaveBeenCalledWith(2, 7);
    expect(service.subscribe).toHaveBeenCalledWith(2, 'task', 7);
  });

  it('subscribe rejects invalid entity types without touching access or service', async () => {
    await expect(controller.subscribe('user' as any, 7, req)).rejects.toBeInstanceOf(BadRequestException);
    expect(access.assertRead).not.toHaveBeenCalled();
    expect(service.subscribe).not.toHaveBeenCalled();
  });

  it('subscribe is refused when the user cannot read the entity', async () => {
    access.assertRead.mockRejectedValue(new ForbiddenException());
    await expect(controller.subscribe('project', 7, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.subscribe).not.toHaveBeenCalled();
  });

  it('subscribe propagates ConflictException', async () => {
    service.subscribe.mockRejectedValue(new ConflictException('Already subscribed'));
    await expect(controller.subscribe('task', 7, req)).rejects.toBeInstanceOf(ConflictException);
  });

  it('unsubscribe uses the requesting user id and propagates NotFound', async () => {
    await controller.unsubscribe('task', 7, req);
    expect(service.unsubscribe).toHaveBeenCalledWith(2, 'task', 7);
    service.unsubscribe.mockRejectedValue(new NotFoundException());
    await expect(controller.unsubscribe('task', 7, req)).rejects.toBeInstanceOf(NotFoundException);
  });
});
