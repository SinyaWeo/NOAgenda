"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const team_controller_1 = require("../team.controller");
const team_service_1 = require("../team.service");
describe('TeamController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [team_controller_1.TeamController],
            providers: [
                {
                    provide: team_service_1.TeamService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(team_controller_1.TeamController);
        service = module.get(team_service_1.TeamService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=team.controller.spec.js.map