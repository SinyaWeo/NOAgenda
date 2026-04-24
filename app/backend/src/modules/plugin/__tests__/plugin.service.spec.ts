import { Test, TestingModule } from '@nestjs/testing';
import { PluginService } from '../plugin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Plugin } from '../plugin.entity';

describe('PluginService', () => {
  let service: PluginService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginService,
        {
          provide: getRepositoryToken(Plugin),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<PluginService>(PluginService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
