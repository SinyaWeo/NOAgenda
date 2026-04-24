"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const plugin_service_1 = require("../plugin.service");
const typeorm_1 = require("@nestjs/typeorm");
const plugin_entity_1 = require("../plugin.entity");
describe('PluginService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                plugin_service_1.PluginService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(plugin_entity_1.Plugin),
                    useValue: { find: jest.fn(), findOne: jest.fn() },
                },
            ],
        }).compile();
        service = module.get(plugin_service_1.PluginService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=plugin.service.spec.js.map