"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const task_controller_1 = require("../task.controller");
const task_service_1 = require("../task.service");
describe('TaskController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [task_controller_1.TaskController],
            providers: [
                {
                    provide: task_service_1.TaskService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(task_controller_1.TaskController);
        service = module.get(task_service_1.TaskService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=task.controller.spec.js.map