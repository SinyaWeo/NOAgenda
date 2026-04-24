import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from '../team.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from '../team.entity';

describe('TeamService', () => {
  let service: TeamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: getRepositoryToken(Team),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<TeamService>(TeamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods here
});
