import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from '../webhook.controller';
import { WebhookService } from '../webhook.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<WebhookController>(WebhookController);
    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
