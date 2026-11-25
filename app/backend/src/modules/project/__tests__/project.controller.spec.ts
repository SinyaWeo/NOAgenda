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
        {
          provide: NodeAccessService,
          useValue: {
            assertRead: jest.fn(),
            assertWrite: jest.fn(),
            assertAdmin: jest.fn(),
            assertCanModify: jest.fn(),
            assertCanUseAsParent: jest.fn(),
            sanitize: jest.fn((x) => x),
            assertProject: jest.fn(),
            projectPermissions: jest.fn(async () => new Map([[4, 'admin']])),
          },
        },
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

  it('findById returns the caller’s permission on the project', async () => {
    jest
      .spyOn(service, 'findById')
      .mockResolvedValue({ id: 4, name: 'P' } as Awaited<ReturnType<ProjectService['findById']>>);
    const res = await controller.findById(4, { user: { userId: 7 } } as Parameters<ProjectController['findById']>[1]);
    expect(res).toMatchObject({ id: 4, access: 'admin' });
  });
});
