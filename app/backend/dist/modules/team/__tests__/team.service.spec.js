"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const team_service_1 = require("../team.service");
const typeorm_1 = require("@nestjs/typeorm");
const team_entity_1 = require("../team.entity");
describe('TeamService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                team_service_1.TeamService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(team_entity_1.Team),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(team_service_1.TeamService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=team.service.spec.js.map