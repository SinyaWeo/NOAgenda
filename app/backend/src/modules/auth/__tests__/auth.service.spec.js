"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const auth_service_1 = require("../auth.service");
const user_service_1 = require("../../user/user.service");
const jwt_1 = require("@nestjs/jwt");
describe('AuthService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                { provide: user_service_1.UserService, useValue: {} },
                { provide: jwt_1.JwtService, useValue: {} },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=auth.service.spec.js.map