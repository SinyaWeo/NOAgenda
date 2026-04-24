import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../task.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../task.entity';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
