import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe, Type } from '@nestjs/common';
import { TaskAssigneeController } from '../task-assignee.controller';
import { TaskAssigneeService } from '../task-assignee.service';
import { TaskAssignee } from '../task-assignee.entity';
import { Repository } from 'typeorm';
import { TaskService } from '../../task/task.service';
import { NodeAccessService } from '../../node/node-access.service';
import { NotificationService } from '../../notification/notification.service';
import { UserService } from '../../user/user.service';
import { TeamService } from '../../team/team.service';
import { asMock, authReq, type Mocks } from '../../../common/__tests__/test-utils';

import { AddAssigneeDto, AddTaskLabelDto, AddRelationDto } from '../dto/task-links.dto';

const req = authReq(2, { username: 'ann' });

describe('TaskAssigneeController', () => {
  let service: Mocks;
  let tasks: Mocks;
  let access: Mocks;
  let notifications: Mocks;
  let users: Mocks;
  let teams: Mocks;
  let controller: TaskAssigneeController;

  beforeEach(() => {
    service = { findByTask: jest.fn(async () => []), add: jest.fn(async () => ({ id: 1 })), remove: jest.fn() };
    tasks = { findById: jest.fn(async () => ({ id: 7, title: 'Ship it' })) };
    access = { assertRead: jest.fn(), assertWrite: jest.fn(), level: jest.fn(async () => 1) };
    teams = { isOwnerOrOwnedTeamMember: jest.fn(async () => false) };
    users = { assertActive: jest.fn(async () => undefined) };
    notifications = { notify: jest.fn(async () => undefined) };
    controller = new TaskAssigneeController(
      asMock<TaskAssigneeService>(service),
      asMock<TaskService>(tasks),
      asMock<NodeAccessService>(access),
      asMock<NotificationService>(notifications),
      asMock<UserService>(users),
      asMock<TeamService>(teams),
    );
  });

  it('findAll asserts read access and returns assignees', async () => {
    service.findByTask.mockResolvedValue([{ id: 1 }]);
    await expect(controller.findAll(7, req)).resolves.toEqual([{ id: 1 }]);
    expect(access.assertRead).toHaveBeenCalledWith(2, 7);
  });

  it('findAll throws 404 for a missing task before checking access', async () => {
    tasks.findById.mockResolvedValue(null);
    await expect(controller.findAll(7, req)).rejects.toBeInstanceOf(NotFoundException);
    expect(access.assertRead).not.toHaveBeenCalled();
  });

  it('findAll does not list assignees when read is denied', async () => {
    access.assertRead.mockRejectedValue(new ForbiddenException());
    await expect(controller.findAll(7, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findByTask).not.toHaveBeenCalled();
  });

  it('add lets a task admin assign a member of a team they own who cannot see the task yet', async () => {
    access.level.mockImplementation(async (uid: number) => (uid === 5 ? 0 : 3));
    teams.isOwnerOrOwnedTeamMember.mockResolvedValue(true);
    await controller.add(7, { userId: 5 }, req);
    expect(teams.isOwnerOrOwnedTeamMember).toHaveBeenCalledWith(2, 5);
    expect(service.add).toHaveBeenCalledWith(7, 5);
  });

  it('add rejects a user without access who is not in a team the caller owns', async () => {
    access.level.mockImplementation(async (uid: number) => (uid === 5 ? 0 : 3));
    await expect(controller.add(7, { userId: 5 }, req)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.add).not.toHaveBeenCalled();
  });

  it('add asserts write, saves and notifies the assignee with the actor', async () => {
    await controller.add(7, { userId: 5 }, req);
    expect(access.assertWrite).toHaveBeenCalledWith(2, 7);
    expect(service.add).toHaveBeenCalledWith(7, 5);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task_assigned',
        recipients: [5],
        actorId: 2,
        actorName: 'ann',
        nodeId: 7,
        kind: 'task',
        title: 'Ship it',
      }),
    );
  });

  it('add rejects a missing or locked user without saving or notifying', async () => {
    users.assertActive.mockRejectedValue(new NotFoundException());
    await expect(controller.add(7, { userId: 5 }, req)).rejects.toBeInstanceOf(NotFoundException);
    expect(service.add).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('add rejects a user who cannot see the task without saving or notifying', async () => {
    access.level.mockResolvedValue(0);
    await expect(controller.add(7, { userId: 5 }, req)).rejects.toBeInstanceOf(BadRequestException);
    expect(access.level).toHaveBeenCalledWith(5, 7);
    expect(service.add).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('add returns the saved assignee', async () => {
    await expect(controller.add(7, { userId: 5 }, req)).resolves.toEqual({ id: 1 });
  });

  it('add does not notify when write is denied', async () => {
    access.assertWrite.mockRejectedValue(new ForbiddenException());
    await expect(controller.add(7, { userId: 5 }, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.add).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('add does not notify when saving fails', async () => {
    service.add.mockRejectedValue(new Error('dup'));
    await expect(controller.add(7, { userId: 5 }, req)).rejects.toThrow('dup');
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('add throws 404 and does not notify for a missing task', async () => {
    tasks.findById.mockResolvedValue(null);
    await expect(controller.add(7, { userId: 5 }, req)).rejects.toBeInstanceOf(NotFoundException);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('remove asserts write and delegates', async () => {
    await controller.remove(7, 5, req);
    expect(access.assertWrite).toHaveBeenCalledWith(2, 7);
    expect(service.remove).toHaveBeenCalledWith(7, 5);
  });

  it('remove throws 404 for a missing task and does nothing on denied write', async () => {
    tasks.findById.mockResolvedValue(null);
    await expect(controller.remove(7, 5, req)).rejects.toBeInstanceOf(NotFoundException);
    tasks.findById.mockResolvedValue({ id: 7 });
    access.assertWrite.mockRejectedValue(new ForbiddenException());
    await expect(controller.remove(7, 5, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.remove).not.toHaveBeenCalled();
  });
});

describe('TaskAssigneeService', () => {
  it('findByTask queries by node id with relations', async () => {
    const repo: Mocks = { find: jest.fn(async () => []) };
    await new TaskAssigneeService(asMock<Repository<TaskAssignee>>(repo)).findByTask(7);
    expect(repo.find).toHaveBeenCalledWith({ where: { node: { id: 7 } }, relations: { user: true, node: true } });
  });

  it('add replaces the previous assignee (one per task) and saves the link', async () => {
    const repo: Mocks = {
      delete: jest.fn(),
      findOne: jest.fn(async () => null),
      create: jest.fn((x: object) => x),
      save: jest.fn(async (x: object) => ({ id: 1, ...x })),
    };
    const res = await new TaskAssigneeService(asMock<Repository<TaskAssignee>>(repo)).add(7, 5);
    expect(repo.delete).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledWith({ node: { id: 7 }, user: { id: 5 } });
    expect(res.id).toBe(1);
  });

  it('add is idempotent when the user is already the assignee', async () => {
    const repo: Mocks = { delete: jest.fn(), findOne: jest.fn(async () => ({ id: 9 })), save: jest.fn() };
    const res = await new TaskAssigneeService(asMock<Repository<TaskAssignee>>(repo)).add(7, 5);
    expect(res.id).toBe(9);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('remove deletes only that task/user pair', async () => {
    const repo: Mocks = { delete: jest.fn() };
    await new TaskAssigneeService(asMock<Repository<TaskAssignee>>(repo)).remove(7, 5);
    expect(repo.delete).toHaveBeenCalledWith({ node: { id: 7 }, user: { id: 5 } });
  });
});

describe('task-links DTOs', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const run = (value: unknown, metatype: Type<unknown>) => pipe.transform(value, { type: 'body', metatype });

  it('accepts a valid AddAssigneeDto', async () => {
    await expect(run({ userId: 3 }, AddAssigneeDto)).resolves.toEqual({ userId: 3 });
  });

  it.each([{ userId: 0 }, { userId: 'x' }, { userId: 1.5 }, {}, { userId: 1, admin: true }])(
    'rejects invalid AddAssigneeDto %j',
    async (body) => {
      await expect(run(body, AddAssigneeDto)).rejects.toThrow();
    },
  );

  it('validates AddTaskLabelDto and AddRelationDto', async () => {
    await expect(run({ labelId: 2 }, AddTaskLabelDto)).resolves.toEqual({ labelId: 2 });
    await expect(run({ labelId: -1 }, AddTaskLabelDto)).rejects.toThrow();
    await expect(run({ relatedTaskId: 2, kind: 'blocks' }, AddRelationDto)).resolves.toBeDefined();
    await expect(run({ relatedTaskId: 2, kind: 'bogus' }, AddRelationDto)).rejects.toThrow();
  });
});
