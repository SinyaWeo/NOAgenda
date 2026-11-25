import { asMock, authReq, invalid, Mocks } from '../../../common/__tests__/test-utils';
import type { Type } from '@nestjs/common';
import { ArgumentMetadata, BadRequestException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Access } from '../../node/node-access.service';
import { KanbanBucketController } from '../kanban-bucket.controller';
import { CreateBucketDto, UpdateBucketDto } from '../dto/kanban-bucket.dto';
import { NodeStatus } from '../../node/node.entity';

const req = authReq(7);
const body = { title: 't', status: NodeStatus.OPEN };

describe('KanbanBucketController', () => {
  let access: Mocks;
  let service: Mocks;
  let controller: KanbanBucketController;

  beforeEach(() => {
    access = { assertProject: jest.fn(async () => undefined) };
    service = {
      findAll: jest.fn(async () => []),
      findOne: jest.fn(async () => ({ id: 1 })),
      create: jest.fn(async () => ({ id: 1 })),
      update: jest.fn(async () => ({ id: 1 })),
      remove: jest.fn(async () => undefined),
    };
    controller = new KanbanBucketController(asMock(service), asMock(access));
  });

  it.each([
    ['findAll', (c: KanbanBucketController) => c.findAll(3, req)],
    ['findOne', (c: KanbanBucketController) => c.findOne(1, 3, req)],
  ])('%s requires READ access', async (_n, call) => {
    await call(controller);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.READ);
  });

  it.each([
    ['create', (c: KanbanBucketController) => c.create(3, body, req)],
    ['update', (c: KanbanBucketController) => c.update(1, 3, { title: 't' }, req)],
    ['remove', (c: KanbanBucketController) => c.remove(1, 3, req)],
  ])('%s requires ADMIN access', async (_n, call) => {
    await call(controller);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.ADMIN);
  });

  it('coerces a string projectId to number for the access check', async () => {
    await controller.findAll(invalid<number>('3'), req);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.READ);
  });

  it('does not touch the service when access is denied', async () => {
    access.assertProject.mockRejectedValue(new ForbiddenException());
    await expect(controller.create(3, body, req)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.remove(1, 3, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('passes bucket and project ids to the service', async () => {
    await controller.update(1, 3, { title: 'n' }, req);
    expect(service.update).toHaveBeenCalledWith(1, 3, { title: 'n' });
  });
});

describe('bucket DTOs', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = (metatype: Type<unknown>): ArgumentMetadata => ({ type: 'body', metatype });

  it('accepts a valid create body', async () => {
    await expect(
      pipe.transform({ title: 'A', status: 'in_progress', position: 0, limit: 5 }, meta(CreateBucketDto)),
    ).resolves.toMatchObject({ title: 'A', status: 'in_progress' });
  });

  it.each([
    {},
    { status: 'open' },
    { title: 'A' },
    { title: 'A', status: 'later' },
    { title: '', status: 'open' },
    { title: 'a'.repeat(256), status: 'open' },
    { title: 'A', status: 'open', position: -1 },
    { title: 'A', status: 'open', limit: 1.5 },
  ])('rejects invalid create body %j', async (b) => {
    await expect(pipe.transform(b, meta(CreateBucketDto))).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['projectId', 'viewId', 'id'])('rejects mass-assigned %s', async (field) => {
    await expect(pipe.transform({ ...body, [field]: 1 }, meta(CreateBucketDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(pipe.transform({ [field]: 1 }, meta(UpdateBucketDto))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an empty update and clearing the limit, but not an empty title or unknown status', async () => {
    await expect(pipe.transform({}, meta(UpdateBucketDto))).resolves.toBeDefined();
    await expect(pipe.transform({ limit: null }, meta(UpdateBucketDto))).resolves.toBeDefined();
    await expect(pipe.transform({ title: '' }, meta(UpdateBucketDto))).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ status: 'x' }, meta(UpdateBucketDto))).rejects.toBeInstanceOf(BadRequestException);
  });
});
