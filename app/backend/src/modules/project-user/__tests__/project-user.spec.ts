import { asMock, authReq, invalid, Mocks } from '../../../common/__tests__/test-utils';
import {
  Type,
  ArgumentMetadata,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Access } from '../../node/node-access.service';
import { Permission } from '../project-user.entity';
import { AddProjectUserDto } from '../dto/project-sharing.dto';
import { ProjectUserController } from '../project-user.controller';
import { ProjectUserService } from '../project-user.service';

const req = authReq(7, { username: 'ann' });
const flush = () => new Promise((r) => setImmediate(r));

describe('ProjectUserService', () => {
  let repo: Mocks;
  let service: ProjectUserService;

  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new ProjectUserService(asMock(repo));
  });

  it('findByProject loads user and project', async () => {
    await service.findByProject(3);
    expect(repo.find).toHaveBeenCalledWith({ where: { project: { id: 3 } }, relations: { user: true, project: true } });
  });

  it('add defaults to READ (least privilege)', async () => {
    await service.add(3, 9);
    expect(repo.save).toHaveBeenCalledWith({ project: { id: 3 }, user: { id: 9 }, permission: Permission.READ });
  });

  it('add honours an explicit permission', async () => {
    await service.add(3, 9, Permission.ADMIN);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ permission: Permission.ADMIN }));
  });

  it('add propagates a duplicate-key error from the database', async () => {
    repo.save.mockRejectedValue(new Error('ER_DUP_ENTRY'));
    await expect(service.add(3, 9)).rejects.toThrow('ER_DUP_ENTRY');
  });

  it('update and remove are scoped to project AND user', async () => {
    await service.update(3, 9, Permission.WRITE);
    expect(repo.update).toHaveBeenCalledWith({ project: { id: 3 }, user: { id: 9 } }, { permission: Permission.WRITE });
    await service.remove(3, 9);
    expect(repo.delete).toHaveBeenCalledWith({ project: { id: 3 }, user: { id: 9 } });
  });
});

describe('ProjectUserController', () => {
  let access: Mocks;
  let service: Mocks;
  let projects: Mocks;
  let notifications: Mocks;
  let users: Mocks;
  let controller: ProjectUserController;

  beforeEach(() => {
    access = { assertProject: jest.fn(async () => undefined) };
    service = {
      findByProject: jest.fn(async () => []),
      add: jest.fn(async () => ({ id: 1 })),
      update: jest.fn(),
      remove: jest.fn(),
    };
    projects = { findById: jest.fn(async () => ({ id: 3, name: 'Alpha' })) };
    notifications = { notify: jest.fn(async () => undefined) };
    users = { assertActive: jest.fn(async () => undefined) };
    controller = new ProjectUserController(
      asMock(service),
      asMock(projects),
      asMock(access),
      asMock(notifications),
      asMock(users),
    );
  });

  it('list requires ADMIN (readers do not see who else has access)', async () => {
    await controller.findAll(3, req);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.ADMIN);
  });

  it('add/update/remove require ADMIN', async () => {
    await controller.add(3, { userId: 9 }, req);
    await controller.update(3, 9, { permission: Permission.WRITE }, req);
    await controller.remove(3, 9, req);
    expect(access.assertProject).toHaveBeenCalledTimes(3);
    for (const call of access.assertProject.mock.calls) expect(call).toEqual([7, 3, Access.ADMIN]);
  });

  it('add notifies the added user with project_added', async () => {
    await controller.add(invalid<number>('3'), { userId: 9, permission: Permission.WRITE }, req);
    await flush();
    expect(service.add).toHaveBeenCalledWith('3', 9, Permission.WRITE);
    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'project_added',
      recipients: [9],
      actorId: 7,
      actorName: 'ann',
      nodeId: 3,
      kind: 'project',
      title: 'Alpha',
    });
  });

  it('add uses an empty title when the project cannot be found', async () => {
    projects.findById.mockResolvedValue(null);
    await controller.add(3, { userId: 9 }, req);
    await flush();
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ title: '' }));
  });

  it('add still succeeds when the notification fails', async () => {
    notifications.notify.mockRejectedValue(new Error('boom'));
    await expect(controller.add(3, { userId: 9 }, req)).resolves.toEqual({ id: 1 });
    await flush();
  });

  it('add rejects a missing or locked user without adding or notifying', async () => {
    users.assertActive.mockRejectedValue(new NotFoundException());
    await expect(controller.add(3, { userId: 9 }, req)).rejects.toBeInstanceOf(NotFoundException);
    await flush();
    expect(users.assertActive).toHaveBeenCalledWith(9);
    expect(service.add).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('add does not add or notify without ADMIN access', async () => {
    access.assertProject.mockRejectedValue(new ForbiddenException());
    await expect(controller.add(3, { userId: 9 }, req)).rejects.toBeInstanceOf(ForbiddenException);
    await flush();
    expect(service.add).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('add does not notify when adding the member fails (e.g. duplicate)', async () => {
    service.add.mockRejectedValue(new Error('dup'));
    await expect(controller.add(3, { userId: 9 }, req)).rejects.toThrow('dup');
    await flush();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('update/remove do nothing when access is denied', async () => {
    access.assertProject.mockRejectedValue(new ForbiddenException());
    await expect(controller.remove(3, 9, req)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.update(3, 9, { permission: Permission.READ }, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.remove).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });
});

describe('AddProjectUserDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = (metatype: Type<unknown>): ArgumentMetadata => ({ type: 'body', metatype });

  it('accepts userId with optional permission', async () => {
    await expect(pipe.transform({ userId: 2 }, meta(AddProjectUserDto))).resolves.toBeDefined();
    await expect(pipe.transform({ userId: 2, permission: 'admin' }, meta(AddProjectUserDto))).resolves.toBeDefined();
  });

  it.each([{}, { userId: 0 }, { userId: 'x' }, { userId: 1, permission: 'owner' }, { userId: 1, role: 'admin' }])(
    'rejects %j',
    async (body) => {
      await expect(pipe.transform(body, meta(AddProjectUserDto))).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
