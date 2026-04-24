"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const webhook_controller_1 = require("../webhook.controller");
const webhook_service_1 = require("../webhook.service");
describe('WebhookController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [webhook_controller_1.WebhookController],
            providers: [
                {
                    provide: webhook_service_1.WebhookService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(webhook_controller_1.WebhookController);
        service = module.get(webhook_service_1.WebhookService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=webhook.controller.spec.js.map