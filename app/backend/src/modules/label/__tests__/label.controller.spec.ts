import { Test, TestingModule } from '@nestjs/testing';
import { LabelController } from '../label.controller';
import { LabelService } from '../label.service';

describe('LabelController', () => {
  let controller: LabelController;
  let service: LabelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabelController],
      providers: [
        {
          provide: LabelService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<LabelController>(LabelController);
    service = module.get<LabelService>(LabelService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
