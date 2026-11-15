import { Test, TestingModule } from '@nestjs/testing';
import { TeamMemberController } from '../team-member.controller';
import { TeamMemberService } from '../team-member.service';
import { TeamService } from '../../team/team.service';

describe('TeamMemberController', () => {
  let controller: TeamMemberController;
  let service: TeamMemberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamMemberController],
      providers: [
        {
          provide: TeamMemberService,
          useValue: { findAll: jest.fn(), add: jest.fn() },
        },
        { provide: TeamService, useValue: { findAll: jest.fn(), findById: jest.fn() } },
      ],
    }).compile();
    controller = module.get<TeamMemberController>(TeamMemberController);
    service = module.get<TeamMemberService>(TeamMemberService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
