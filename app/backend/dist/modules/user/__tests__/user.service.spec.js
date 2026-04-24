"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const user_service_1 = require("../user.service");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../user.entity");
describe('UserService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                user_service_1.UserService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(user_entity_1.User),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(user_service_1.UserService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=user.service.spec.js.map