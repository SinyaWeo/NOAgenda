import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from '../comment.controller';
import { CommentService } from '../comment.service';

describe('CommentController', () => {
  let controller: CommentController;
  let service: CommentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<CommentController>(CommentController);
    service = module.get<CommentService>(CommentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
