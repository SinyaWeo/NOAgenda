import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { TaskController } from '../task.controller';
import { TaskService } from '../task.service';

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
