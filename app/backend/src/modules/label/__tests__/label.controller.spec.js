"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const label_controller_1 = require("../label.controller");
const label_service_1 = require("../label.service");
describe('LabelController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [label_controller_1.LabelController],
            providers: [
                {
                    provide: label_service_1.LabelService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(label_controller_1.LabelController);
        service = module.get(label_service_1.LabelService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=label.controller.spec.js.map