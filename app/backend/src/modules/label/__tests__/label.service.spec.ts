import { Test, TestingModule } from '@nestjs/testing';
import { LabelService } from '../label.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Label } from '../label.entity';

describe('LabelService', () => {
  let service: LabelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelService,
        {
          provide: getRepositoryToken(Label),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<LabelService>(LabelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
