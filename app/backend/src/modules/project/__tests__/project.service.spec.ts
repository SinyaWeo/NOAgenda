import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../project.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../project.entity';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
