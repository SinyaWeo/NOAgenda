"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const team_member_controller_1 = require("../team-member.controller");
const team_member_service_1 = require("../team-member.service");
describe('TeamMemberController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [team_member_controller_1.TeamMemberController],
            providers: [
                {
                    provide: team_member_service_1.TeamMemberService,
                    useValue: { findAll: jest.fn(), add: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(team_member_controller_1.TeamMemberController);
        service = module.get(team_member_service_1.TeamMemberService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=team-member.controller.spec.js.map