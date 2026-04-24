"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const notification_service_1 = require("../notification.service");
const typeorm_1 = require("@nestjs/typeorm");
const notification_entity_1 = require("../notification.entity");
describe('NotificationService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                notification_service_1.NotificationService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(notification_entity_1.Notification),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(notification_service_1.NotificationService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=notification.service.spec.js.map