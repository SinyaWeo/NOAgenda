import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { TaskController } from '../task.controller';
import { TaskService } from '../task.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskAssignee } from '../../task-assignee/task-assignee.entity';
import { TeamService } from '../../team/team.service';
import { UserService } from '../../user/user.service';
import { NotificationService } from '../../notification/notification.service';

describe('TaskController', () => {
  let controller: TaskController;
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
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
          },
        },
        { provide: getRepositoryToken(TaskAssignee), useValue: { save: jest.fn(), create: jest.fn((x) => x) } },
        { provide: TeamService, useValue: { isSelfOrManagedTeamMember: jest.fn() } },
        { provide: UserService, useValue: { assertActive: jest.fn() } },
        { provide: NotificationService, useValue: { notify: jest.fn() } },
        {
          provide: TaskService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<TaskController>(TaskController);
    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
