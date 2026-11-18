import { asMock, authReq, Mocks } from '../../../common/__tests__/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { CommentController } from '../comment.controller';
import { CommentService } from '../comment.service';
import { TaskService } from '../../task/task.service';
import { TaskAssigneeService } from '../../task-assignee/task-assignee.service';
import { DomainEvents } from '../../../common/domain-events';
import { NotificationService } from '../../notification/notification.service';

describe('CommentController', () => {
  let controller: CommentController;
  let service: CommentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
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
        {
          provide: CommentService,
          useValue: { findAll: jest.fn(), findById: jest.fn(), create: jest.fn(async (c) => ({ id: 1, ...c })) },
        },
        {
          provide: TaskService,
          useValue: { findById: jest.fn(async () => ({ id: 7, title: 'Ship it', createdBy: 3 })) },
        },
        {
          provide: TaskAssigneeService,
          useValue: { findByTask: jest.fn(async () => [{ user: { id: 4 } }, { user: { id: 2 } }]) },
        },
        { provide: DomainEvents, useValue: { emit: jest.fn() } },
        { provide: NotificationService, useValue: { notify: jest.fn(async () => undefined) } },
      ],
    }).compile();
    controller = module.get<CommentController>(CommentController);
    service = module.get<CommentService>(CommentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('announces a new comment to webhooks', async () => {
    const events = asMock<{ events: Mocks }>(controller).events;
    await controller.create({ content: 'Looks good', taskId: 7 }, authReq(2, { username: 'ann' }));
    await new Promise((r) => setImmediate(r));
    expect(events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'comment.created',
        nodeId: 7,
        owner: 3,
        data: expect.objectContaining({ taskId: 7, content: 'Looks good', authorId: 2 }),
      }),
    );
  });

  it('notifies the task creator and assignees about a new comment, not the commenter', async () => {
    const notifications = asMock<{ notifications: Mocks }>(controller).notifications;
    await controller.create({ content: 'Looks good', taskId: 7 }, authReq(2, { username: 'ann' }));
    await new Promise((r) => setImmediate(r)); // notification runs in the background
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task_comment',
        recipients: [3, 4, 2],
        actorId: 2,
        actorName: 'ann',
        nodeId: 7,
        title: 'Ship it',
      }),
    );
  });
});
