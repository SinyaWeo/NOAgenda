"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const team_member_service_1 = require("../team-member.service");
const typeorm_1 = require("@nestjs/typeorm");
const team_member_entity_1 = require("../team-member.entity");
describe('TeamMemberService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                team_member_service_1.TeamMemberService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(team_member_entity_1.TeamMember),
                    useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(team_member_service_1.TeamMemberService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=team-member.service.spec.js.map