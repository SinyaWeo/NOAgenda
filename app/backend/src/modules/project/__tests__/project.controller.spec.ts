import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { ProjectController } from '../project.controller';
import { ProjectService } from '../project.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        { provide: NodeAccessService, useValue: { assertRead: jest.fn(), assertWrite: jest.fn(), assertAdmin: jest.fn(), assertCanModify: jest.fn(), assertCanUseAsParent: jest.fn(), sanitize: jest.fn((x) => x) } },
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
