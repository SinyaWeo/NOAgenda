import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { ProjectController } from '../project.controller';
import { ProjectService } from '../project.service';
import { ProjectTeamService } from '../../project-team/project-team.service';
import { AppSettingsService } from '../../app-settings/app-settings.service';
import { UserService } from '../../user/user.service';
import { ForbiddenException } from '@nestjs/common';
import type { AuthRequest } from '../../../common/auth-user';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: ProjectService;
  let teams: { canUseTeam: jest.Mock; add: jest.Mock };
  let settings: { singleUserMode: jest.Mock };
  const req = { user: { userId: 7 } } as AuthRequest;

  beforeEach(async () => {
    teams = { canUseTeam: jest.fn(async () => true), add: jest.fn(async () => ({})) };
    settings = { singleUserMode: jest.fn(async () => false) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: NodeAccessService,
          useValue: {
            assertRead: jest.fn(),
            assertWrite: jest.fn(),
            assertAdmin: jest.fn(),
            assertCanModify: jest.fn(),
            assertCanUseAsParent: jest.fn(),
            assertProjectParent: jest.fn(),
            assertCanReparent: jest.fn(),
            assertCanRemove: jest.fn(),
            ownsProjectTree: jest.fn(async () => false),
            sanitize: jest.fn((x) => x),
            assertProject: jest.fn(),
            projectPermissions: jest.fn(async () => new Map([[4, 'admin']])),
          },
        },
        {
          provide: ProjectService,
          useValue: { findAll: jest.fn(), findById: jest.fn(), create: jest.fn(async () => ({ id: 4 })) },
        },
        { provide: ProjectTeamService, useValue: teams },
        { provide: AppSettingsService, useValue: settings },
        {
          provide: UserService,
          useValue: {
            summaries: jest.fn(
              async (ids: number[]) => new Map(ids.map((id) => [id, { id, username: `u${id}`, name: `User ${id}` }])),
            ),
          },
        },
      ],
    }).compile();
    controller = module.get<ProjectController>(ProjectController);
    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findById returns the caller’s permission on the project', async () => {
    jest
      .spyOn(service, 'findById')
      .mockResolvedValue({ id: 4, name: 'P' } as Awaited<ReturnType<ProjectService['findById']>>);
    const res = await controller.findById(4, { user: { userId: 7 } } as Parameters<ProjectController['findById']>[1]);
    expect(res).toMatchObject({ id: 4, access: 'admin', canRemove: false });
  });

  it('edit, archive and delete use the shared node rules, not an owner-only check', async () => {
    const access = (controller as unknown as { access: Record<string, jest.Mock> }).access;
    const project = { id: 4, ownerId: 99, parentId: null } as Awaited<ReturnType<ProjectService['findById']>>;
    jest.spyOn(service, 'findById').mockResolvedValue(project);
    Object.assign(service, {
      update: jest.fn(async () => project),
      archive: jest.fn(async () => project),
      remove: jest.fn(async () => undefined),
    });
    await controller.update(4, { name: 'Renamed' }, req);
    await controller.archive(4, req);
    expect(access.assertCanModify).toHaveBeenCalledTimes(2);
    expect(access.assertCanRemove).not.toHaveBeenCalled();
    access.assertCanRemove.mockRejectedValueOnce(new ForbiddenException());
    await expect(controller.remove(4, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('names the owner on projects the caller does not own, and only on those', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue([
      { id: 1, name: 'Mine', ownerId: 7 },
      { id: 2, name: 'Shared', ownerId: 9 },
    ] as Awaited<ReturnType<ProjectService['findAll']>>);
    const res = await controller.findAll(req);
    expect(res.find((p) => p.id === 1)?.owner).toBeUndefined();
    expect(res.find((p) => p.id === 2)?.owner).toEqual({ id: 9, username: 'u9', name: 'User 9' });
  });

  it('create shares the new project with the chosen team (write by default)', async () => {
    await controller.create({ name: 'P', teamId: 3 }, req);
    expect(service.create).toHaveBeenCalledWith({ name: 'P', ownerId: 7 }, 7);
    expect(teams.add).toHaveBeenCalledWith(4, 3, 'write');
  });

  it('create refuses a team the caller does not belong to, before creating anything', async () => {
    teams.canUseTeam.mockResolvedValue(false);
    await expect(controller.create({ name: 'P', teamId: 3 }, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('create refuses a team in single-user mode', async () => {
    settings.singleUserMode.mockResolvedValue(true);
    await expect(controller.create({ name: 'P', teamId: 3 }, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('create without a team shares nothing', async () => {
    await controller.create({ name: 'P' }, req);
    expect(teams.canUseTeam).not.toHaveBeenCalled();
    expect(teams.add).not.toHaveBeenCalled();
  });

  it('create under a parent checks that the parent is a project the caller can write to', async () => {
    const access = (controller as unknown as { access: Record<string, jest.Mock> }).access;
    await controller.create({ name: 'Sub', parentId: 4 }, req);
    expect(access.assertCanUseAsParent).toHaveBeenCalledWith(7, 4);
    expect(access.assertProjectParent).toHaveBeenCalledWith(4);
    expect(service.create).toHaveBeenCalledWith({ name: 'Sub', parentId: 4, ownerId: 7 }, 7);
  });
});
