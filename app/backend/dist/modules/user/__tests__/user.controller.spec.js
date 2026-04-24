"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const user_controller_1 = require("../user.controller");
const user_service_1 = require("../user.service");
describe('UserController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [user_controller_1.UserController],
            providers: [
                {
                    provide: user_service_1.UserService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(user_controller_1.UserController);
        service = module.get(user_service_1.UserService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=user.controller.spec.js.map