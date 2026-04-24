import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentService } from '../attachment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Attachment } from '../attachment.entity';

describe('AttachmentService', () => {
  let service: AttachmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        {
          provide: getRepositoryToken(Attachment),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<AttachmentService>(AttachmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
