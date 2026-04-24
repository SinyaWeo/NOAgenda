"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const comment_service_1 = require("../comment.service");
const typeorm_1 = require("@nestjs/typeorm");
const comment_entity_1 = require("../comment.entity");
describe('CommentService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                comment_service_1.CommentService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(comment_entity_1.Comment),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(comment_service_1.CommentService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=comment.service.spec.js.map