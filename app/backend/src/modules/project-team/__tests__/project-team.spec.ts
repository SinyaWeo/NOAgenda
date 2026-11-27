import { asMock, authReq, invalid, Mocks } from '../../../common/__tests__/test-utils';
import type { Type } from '@nestjs/common';
import { ArgumentMetadata, BadRequestException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Access } from '../../node/node-access.service';
import { Permission } from '../../project-user/project-user.entity';
import { AddProjectTeamDto, SetPermissionDto } from '../../project-user/dto/project-sharing.dto';
import { ProjectTeamController } from '../project-team.controller';
import { ProjectTeamService } from '../project-team.service';

const req = authReq(7);

type RepoMock = Record<'find' | 'create' | 'save' | 'update' | 'delete', jest.Mock> & { manager: { query: jest.Mock } };

describe('ProjectTeamService', () => {
  let repo: RepoMock;
  let service: ProjectTeamService;

  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      update: jest.fn(),
      delete: jest.fn(),
      manager: { query: jest.fn(async () => [{ 1: 1 }]) },
    };
    service = new ProjectTeamService(asMock(repo));
  });

  it('findByProject loads team and project', async () => {
    await service.findByProject(3);
    expect(repo.find).toHaveBeenCalledWith({ where: { project: { id: 3 } }, relations: { team: true, project: true } });
  });

  it('add defaults to READ permission', async () => {
    await service.add(3, 5);
    expect(repo.save).toHaveBeenCalledWith({ project: { id: 3 }, team: { id: 5 }, permission: Permission.READ });
  });

  it('add uses the given permission', async () => {
    await service.add(3, 5, Permission.ADMIN);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ permission: Permission.ADMIN }));
  });

  it('update and remove are scoped to project AND team', async () => {
    await service.update(3, 5, Permission.WRITE);
    expect(repo.update).toHaveBeenCalledWith({ project: { id: 3 }, team: { id: 5 } }, { permission: Permission.WRITE });
    await service.remove(3, 5);
    expect(repo.delete).toHaveBeenCalledWith({ project: { id: 3 }, team: { id: 5 } });
  });

  it('canUseTeam is true when the query returns a row, passing team then user ids', async () => {
    await expect(service.canUseTeam(7, 5)).resolves.toBe(true);
    expect(repo.manager.query).toHaveBeenCalledWith(expect.stringContaining('ownerId'), [5, 7, 7]);
  });

  it('canUseTeam is false when the user neither owns nor belongs to the team', async () => {
    repo.manager.query.mockResolvedValue([]);
    await expect(service.canUseTeam(7, 5)).resolves.toBe(false);
  });
});

describe('ProjectTeamController', () => {
  let access: Mocks;
  let service: Mocks;
  let controller: ProjectTeamController;

  beforeEach(() => {
    access = { assertProject: jest.fn(async () => undefined) };
    service = {
      findByProject: jest.fn(async () => []),
      canUseTeam: jest.fn(async () => true),
      add: jest.fn(async () => ({ id: 1 })),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new ProjectTeamController(asMock(service), asMock(access));
  });

  it('list requires ADMIN (readers do not see who else has access)', async () => {
    await controller.findAll(3, req);
    expect(access.assertProject).toHaveBeenCalledWith(7, 3, Access.ADMIN);
  });

  it('add/update/remove require ADMIN', async () => {
    await controller.add(3, { teamId: 5 }, req);
    await controller.update(3, 5, { permission: Permission.WRITE }, req);
    await controller.remove(3, 5, req);
    for (const call of access.assertProject.mock.calls) expect(call).toEqual([7, 3, Access.ADMIN]);
    expect(access.assertProject).toHaveBeenCalledTimes(3);
  });

  it('add forwards permission and checks team usability for the caller', async () => {
    await controller.add(3, { teamId: 5, permission: Permission.WRITE }, req);
    expect(service.canUseTeam).toHaveBeenCalledWith(7, 5);
    expect(service.add).toHaveBeenCalledWith(3, 5, Permission.WRITE);
  });

  it('add refuses a team the caller neither owns nor belongs to', async () => {
    service.canUseTeam.mockResolvedValue(false);
    await expect(controller.add(3, { teamId: 5 }, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.add).not.toHaveBeenCalled();
  });

  it('add does not check the team when the caller is not project admin', async () => {
    access.assertProject.mockRejectedValue(new ForbiddenException());
    await expect(controller.add(3, { teamId: 5 }, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.canUseTeam).not.toHaveBeenCalled();
  });

  it('update/remove do nothing when access is denied', async () => {
    access.assertProject.mockRejectedValue(new ForbiddenException());
    await expect(controller.remove(3, 5, req)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.update(3, 5, { permission: Permission.READ }, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.remove).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });
});

describe('team sharing DTOs', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = (metatype: Type<unknown>): ArgumentMetadata => ({ type: 'body', metatype });

  it('accepts valid bodies', async () => {
    await expect(pipe.transform({ teamId: 2, permission: 'write' }, meta(AddProjectTeamDto))).resolves.toBeDefined();
    await expect(pipe.transform({ permission: 'admin' }, meta(SetPermissionDto))).resolves.toBeDefined();
  });

  it.each([{}, { teamId: 0 }, { teamId: '2' }, { teamId: 1, permission: 'owner' }, { teamId: 1, projectId: 2 }])(
    'rejects invalid add body %j',
    async (body) => {
      await expect(pipe.transform(body, meta(AddProjectTeamDto))).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('SetPermissionDto requires a valid permission', async () => {
    await expect(pipe.transform({}, meta(SetPermissionDto))).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ permission: 'root' }, meta(SetPermissionDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
