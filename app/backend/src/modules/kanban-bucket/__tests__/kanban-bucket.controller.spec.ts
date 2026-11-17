import { ArgumentMetadata, BadRequestException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Access } from '../../node/node-access.service';
import { KanbanBucketController } from '../kanban-bucket.controller';
import { CreateBucketDto, UpdateBucketDto } from '../dto/kanban-bucket.dto';

const req = { user: { userId: 7 } };

describe('KanbanBucketController', () => {
  let access: any;
  let service: any;
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
    controller = new KanbanBucketController(service, {} as any, access);
  });

  it.each([
    ['findAll', (c: KanbanBucketController) => c.findAll(3 as any, 4 as any, req)],
    ['findOne', (c: KanbanBucketController) => c.findOne(1 as any, 3 as any, 4 as any, req)],
  ])('%s requires READ access', async (_n, call) => {
    await call(controller);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.READ);
  });

  it.each([
    ['create', (c: KanbanBucketController) => c.create(3 as any, 4 as any, { title: 't' }, req)],
    ['update', (c: KanbanBucketController) => c.update(1 as any, 3 as any, 4 as any, { title: 't' }, req)],
    ['remove', (c: KanbanBucketController) => c.remove(1 as any, 3 as any, 4 as any, req)],
  ])('%s requires ADMIN access', async (_n, call) => {
    await call(controller);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.ADMIN);
  });

  it('coerces a string projectId to number for the access check', async () => {
    await controller.findAll('3' as any, 4 as any, req);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.READ);
  });

  it('does not touch the service when access is denied', async () => {
    access.assertProject.mockRejectedValue(new ForbiddenException());
    await expect(controller.create(3 as any, 4 as any, { title: 't' }, req)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.remove(1 as any, 3 as any, 4 as any, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('passes project and view ids to the service', async () => {
    await controller.update(1 as any, 3 as any, 4 as any, { title: 'n' }, req);
    expect(service.update).toHaveBeenCalledWith(1, 3, 4, { title: 'n' });
  });
});

describe('bucket DTOs', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = (metatype: any): ArgumentMetadata => ({ type: 'body', metatype });

  it('accepts a valid create body', async () => {
    await expect(pipe.transform({ title: 'A', position: 0, limit: 5 }, meta(CreateBucketDto))).resolves.toMatchObject({
      title: 'A',
    });
  });

  it.each([{}, { title: '' }, { title: 'a'.repeat(256) }, { title: 'A', position: -1 }, { title: 'A', limit: 1.5 }])(
    'rejects invalid create body %j',
    async (body) => {
      await expect(pipe.transform(body, meta(CreateBucketDto))).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(['projectId', 'viewId', 'id'])('rejects mass-assigned %s', async (field) => {
    await expect(pipe.transform({ title: 'A', [field]: 1 }, meta(CreateBucketDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(pipe.transform({ [field]: 1 }, meta(UpdateBucketDto))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an empty update but not an empty title', async () => {
    await expect(pipe.transform({}, meta(UpdateBucketDto))).resolves.toBeDefined();
    await expect(pipe.transform({ title: '' }, meta(UpdateBucketDto))).rejects.toBeInstanceOf(BadRequestException);
  });
});
