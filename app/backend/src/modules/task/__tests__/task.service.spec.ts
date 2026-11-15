import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../task.service';
import { NodeService } from '../../node/node.service';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: NodeService, useValue: { findAll: jest.fn(), findById: jest.fn() } },
      ],
    }).compile();
    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
