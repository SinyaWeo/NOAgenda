import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { NodeService } from '../../node/node.service';
import { DomainEvents } from '../../../common/domain-events';
import { AttachmentController } from '../attachment.controller';
import { AttachmentService } from '../attachment.service';

describe('AttachmentController', () => {
  let controller: AttachmentController;
  let service: AttachmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentController],
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
        { provide: NodeService, useValue: { findById: jest.fn() } },
        { provide: DomainEvents, useValue: { emit: jest.fn() } },
        {
          provide: AttachmentService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<AttachmentController>(AttachmentController);
    service = module.get<AttachmentService>(AttachmentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
