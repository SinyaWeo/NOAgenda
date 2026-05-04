import { Test, TestingModule } from '@nestjs/testing';
import { QuoteService } from '../quote.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Quote } from '../quote.entity';

describe('QuoteService', () => {
  let service: QuoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        {
          provide: getRepositoryToken(Quote),
          useValue: { find: jest.fn(), findOne: jest.fn(), count: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<QuoteService>(QuoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
