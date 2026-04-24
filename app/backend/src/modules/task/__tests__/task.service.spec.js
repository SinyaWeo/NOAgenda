"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const task_service_1 = require("../task.service");
const typeorm_1 = require("@nestjs/typeorm");
const task_entity_1 = require("../task.entity");
describe('TaskService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                task_service_1.TaskService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(task_entity_1.Task),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(task_service_1.TaskService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=task.service.spec.js.map