import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from '../team.controller';
import { TeamService } from '../team.service';
import { TeamAccessService } from '../team-access.service';

describe('TeamController', () => {
  let controller: TeamController;
  let service: TeamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        {
          provide: TeamService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
        { provide: TeamAccessService, useValue: { assertView: jest.fn(), assertManage: jest.fn() } },
      ],
    }).compile();
    controller = module.get<TeamController>(TeamController);
    service = module.get<TeamService>(TeamService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
