"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const label_service_1 = require("../label.service");
const typeorm_1 = require("@nestjs/typeorm");
const label_entity_1 = require("../label.entity");
describe('LabelService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                label_service_1.LabelService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(label_entity_1.Label),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(label_service_1.LabelService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=label.service.spec.js.map