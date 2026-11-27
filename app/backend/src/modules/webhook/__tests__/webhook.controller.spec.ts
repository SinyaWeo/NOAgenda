import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { WebhookController } from '../webhook.controller';
import { WebhookService } from '../webhook.service';
import { WebhookDispatcher } from '../webhook-dispatcher.service';
import { authReq } from '../../../common/__tests__/test-utils';

describe('WebhookController', () => {
  let controller: WebhookController;
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
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
        {
          provide: WebhookService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
        { provide: WebhookDispatcher, useValue: { sendTest: jest.fn() } },
      ],
    }).compile();
    controller = module.get<WebhookController>(WebhookController);
    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('the signing secret is write-only', () => {
    const hook = { id: 5, url: 'https://example.com/h', event: '*', secret: 'plain-signing-secret', userId: 1 };
    const noSecret = { id: 6, url: 'https://example.com/h', event: '*', secret: null, userId: 1 };

    it('no response contains the secret, only whether one is set', async () => {
      jest.mocked(service.findById).mockResolvedValue(hook as never);
      jest.mocked(service.findAll).mockResolvedValue([hook, noSecret] as never);
      const one = await controller.findById(5, authReq(1));
      const all = await controller.findAll(authReq(1));
      for (const res of [one, ...all]) {
        expect(res).not.toHaveProperty('secret');
        expect(JSON.stringify(res)).not.toContain('plain-signing-secret');
      }
      expect(one).toMatchObject({ hasSecret: true });
      expect(all.map((w) => (w as { hasSecret?: boolean }).hasSecret)).toEqual([true, false]);
    });
  });
});
