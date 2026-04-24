"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const project_controller_1 = require("../project.controller");
const project_service_1 = require("../project.service");
describe('ProjectController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [project_controller_1.ProjectController],
            providers: [
                {
                    provide: project_service_1.ProjectService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(project_controller_1.ProjectController);
        service = module.get(project_service_1.ProjectService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=project.controller.spec.js.map