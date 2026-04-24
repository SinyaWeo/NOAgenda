"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const webhook_service_1 = require("../webhook.service");
const typeorm_1 = require("@nestjs/typeorm");
const webhook_entity_1 = require("../webhook.entity");
describe('WebhookService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                webhook_service_1.WebhookService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(webhook_entity_1.Webhook),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(webhook_service_1.WebhookService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=webhook.service.spec.js.map