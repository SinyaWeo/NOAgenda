import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from '../webhook.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Webhook } from '../webhook.entity';

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
