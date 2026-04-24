"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const plugin_controller_1 = require("../plugin.controller");
const plugin_service_1 = require("../plugin.service");
describe('PluginController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [plugin_controller_1.PluginController],
            providers: [
                {
                    provide: plugin_service_1.PluginService,
                    useValue: { findAll: jest.fn(), findById: jest.fn() },
                },
            ],
        }).compile();
        controller = module.get(plugin_controller_1.PluginController);
        service = module.get(plugin_service_1.PluginService);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=plugin.controller.spec.js.map