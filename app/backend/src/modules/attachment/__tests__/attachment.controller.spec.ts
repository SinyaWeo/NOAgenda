import { Test, TestingModule } from '@nestjs/testing';
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
