import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from '../project.controller';
import { ProjectService } from '../project.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<ProjectController>(ProjectController);
    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
