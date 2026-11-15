import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../project.service';
import { NodeService } from '../../node/node.service';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: NodeService, useValue: { findAll: jest.fn(), findById: jest.fn() } },
      ],
    }).compile();
    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
