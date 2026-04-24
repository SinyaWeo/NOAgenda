"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const notification_controller_1 = require("../notification.controller");
const notification_service_1 = require("../notification.service");
describe('NotificationController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [notification_controller_1.NotificationController],
            providers: [
                {
                    provide: notification_service_1.NotificationService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(notification_controller_1.NotificationController);
        service = module.get(notification_service_1.NotificationService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=notification.controller.spec.js.map