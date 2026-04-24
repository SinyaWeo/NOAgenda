import { Test, TestingModule } from '@nestjs/testing';
import { TeamMemberService } from '../team-member.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TeamMember } from '../team-member.entity';

describe('TeamMemberService', () => {
  let service: TeamMemberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamMemberService,
        {
          provide: getRepositoryToken(TeamMember),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<TeamMemberService>(TeamMemberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
