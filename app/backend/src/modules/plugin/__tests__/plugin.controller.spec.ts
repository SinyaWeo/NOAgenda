import { Test, TestingModule } from '@nestjs/testing';
import { PluginController } from '../plugin.controller';
import { PluginService } from '../plugin.service';

describe('PluginController', () => {
  let controller: PluginController;
  let service: PluginService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: PluginService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<PluginController>(PluginController);
    service = module.get<PluginService>(PluginService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
