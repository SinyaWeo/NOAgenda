import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { ProjectController } from '../project.controller';
import { ProjectService } from '../project.service';
import { ProjectTeamService } from '../../project-team/project-team.service';
import { AppSettingsService } from '../../app-settings/app-settings.service';
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
    expect(res).toMatchObject({ id: 4, access: 'admin' });
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
});
