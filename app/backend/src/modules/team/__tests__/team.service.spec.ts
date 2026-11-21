import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from '../team.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from '../team.entity';
import { TeamMember } from '../../team-member/team-member.entity';

describe('TeamService', () => {
  let service: TeamService;
  const members = { exists: jest.fn(), find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: getRepositoryToken(Team),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        { provide: getRepositoryToken(TeamMember), useValue: members },
      ],
    }).compile();
    service = module.get<TeamService>(TeamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('isOwnerOrOwnedTeamMember: the owner themselves is always allowed without a query', async () => {
    await expect(service.isOwnerOrOwnedTeamMember(1, 1)).resolves.toBe(true);
    expect(members.exists).not.toHaveBeenCalled();
  });

  it('isOwnerOrOwnedTeamMember: others only when in a team the owner owns', async () => {
    members.exists.mockResolvedValue(false);
    await expect(service.isOwnerOrOwnedTeamMember(1, 2)).resolves.toBe(false);
    expect(members.exists).toHaveBeenCalledWith({ where: { user: { id: 2 }, team: { ownerId: 1 } } });
  });

  it('findAssignableUsers returns de-duplicated summaries without private fields', async () => {
    const u = { id: 2, username: 'bob', name: 'Bob', avatarUrl: null, email: 'bob@x.com' };
    members.find.mockResolvedValue([{ user: u }, { user: u }]);
    await expect(service.findAssignableUsers(1)).resolves.toEqual([
      { id: 2, username: 'bob', name: 'Bob', avatarUrl: null },
    ]);
  });

  // Add more tests for service methods here
});
