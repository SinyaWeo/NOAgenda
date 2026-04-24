"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const attachment_service_1 = require("../attachment.service");
const typeorm_1 = require("@nestjs/typeorm");
const attachment_entity_1 = require("../attachment.entity");
describe('AttachmentService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                attachment_service_1.AttachmentService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(attachment_entity_1.Attachment),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(attachment_service_1.AttachmentService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=attachment.service.spec.js.map