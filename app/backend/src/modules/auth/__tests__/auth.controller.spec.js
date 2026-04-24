"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const auth_controller_1 = require("../auth.controller");
const auth_service_1 = require("../auth.service");
describe('AuthController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [auth_controller_1.AuthController],
            providers: [
                {
                    provide: auth_service_1.AuthService,
                    useValue: { login: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(auth_controller_1.AuthController);
        service = module.get(auth_service_1.AuthService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=auth.controller.spec.js.map