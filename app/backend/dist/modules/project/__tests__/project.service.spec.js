"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const project_service_1 = require("../project.service");
const typeorm_1 = require("@nestjs/typeorm");
const project_entity_1 = require("../project.entity");
describe('ProjectService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                project_service_1.ProjectService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(project_entity_1.Project),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(project_service_1.ProjectService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=project.service.spec.js.map