"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const attachment_controller_1 = require("../attachment.controller");
const attachment_service_1 = require("../attachment.service");
describe('AttachmentController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [attachment_controller_1.AttachmentController],
            providers: [
                {
                    provide: attachment_service_1.AttachmentService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(attachment_controller_1.AttachmentController);
        service = module.get(attachment_service_1.AttachmentService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=attachment.controller.spec.js.map