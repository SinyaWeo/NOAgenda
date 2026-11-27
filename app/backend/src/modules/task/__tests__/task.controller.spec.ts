import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { TaskController } from '../task.controller';
import { TaskService } from '../task.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskAssignee } from '../../task-assignee/task-assignee.entity';
import { TeamService } from '../../team/team.service';
import { UserService } from '../../user/user.service';
import { NotificationService } from '../../notification/notification.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NodeType } from '../../node/node.entity';
import { ScheduleDto } from '../../node/dto/node.dto';
import { authReq } from '../../../common/__tests__/test-utils';

describe('TaskController', () => {
  let controller: TaskController;
  let service: TaskService;
  let access: NodeAccessService;

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
          useValue: { findAll: jest.fn(), findById: jest.fn(), reschedule: jest.fn(async () => []) },
        },
      ],
    }).compile();
    controller = module.get<TaskController>(TaskController);
    service = module.get<TaskService>(TaskService);
    access = module.get<NodeAccessService>(NodeAccessService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /tasks/schedule', () => {
    const body = {
      changes: [
        { id: 5, startDate: '2026-12-02T11:00:00.000Z', dueDate: '2026-12-04T11:00:00.000Z' },
        { id: 6, startDate: null, dueDate: '2026-12-06T11:00:00.000Z' },
      ],
    };

    it('checks write access on every task before changing any, then reschedules them together', async () => {
      jest.mocked(service.findById).mockImplementation(async (id: number) => ({ id, type: NodeType.TASK }) as never);
      await controller.schedule(body, authReq(2));
      expect(access.assertWrite).toHaveBeenCalledWith(2, 5);
      expect(access.assertWrite).toHaveBeenCalledWith(2, 6);
      expect(service.reschedule).toHaveBeenCalledWith(
        [
          { id: 5, startDate: new Date('2026-12-02T11:00:00.000Z'), dueDate: new Date('2026-12-04T11:00:00.000Z') },
          { id: 6, startDate: null, dueDate: new Date('2026-12-06T11:00:00.000Z') },
        ],
        2,
      );
    });

    it('changes nothing when one task is not writable', async () => {
      jest.mocked(service.findById).mockImplementation(async (id: number) => ({ id, type: NodeType.TASK }) as never);
      jest.mocked(access.assertWrite).mockImplementation(async (_u: number, id: number) => {
        if (id === 6) throw new ForbiddenException();
      });
      await expect(controller.schedule(body, authReq(2))).rejects.toBeInstanceOf(ForbiddenException);
      expect(service.reschedule).not.toHaveBeenCalled();
    });

    it('only tasks can be rescheduled', async () => {
      jest.mocked(service.findById).mockResolvedValue({ id: 5, type: NodeType.PROJECT } as never);
      await expect(controller.schedule(body, authReq(2))).rejects.toBeInstanceOf(NotFoundException);
      expect(service.reschedule).not.toHaveBeenCalled();
    });

    it('validates the body: dates or null, 1 to 500 changes', async () => {
      const errors = async (b: object) => (await validate(plainToInstance(ScheduleDto, b))).length;
      expect(await errors(body)).toBe(0);
      expect(await errors({ changes: [] })).toBeGreaterThan(0);
      expect(await errors({ changes: [{ id: 5, startDate: 'soon', dueDate: null }] })).toBeGreaterThan(0);
      expect(await errors({ changes: [{ id: 5, dueDate: null }] })).toBeGreaterThan(0); // startDate missing
      expect(
        await errors({
          changes: Array.from({ length: 501 }, (_, i) => ({ id: i + 1, startDate: null, dueDate: null })),
        }),
      ).toBeGreaterThan(0);
    });
  });
});
