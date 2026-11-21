import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from '../team.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from '../team.entity';
import { TeamMember } from '../../team-member/team-member.entity';

describe('TeamService', () => {
  let service: TeamService;
  const qb = {
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getExists: jest.fn(),
    getMany: jest.fn(),
  };
  const members = { createQueryBuilder: jest.fn(() => qb), find: jest.fn() };

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

  it('isSelfOrManagedTeamMember: the caller themselves is always allowed without a query', async () => {
    await expect(service.isSelfOrManagedTeamMember(1, 1)).resolves.toBe(true);
    expect(members.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('isSelfOrManagedTeamMember: others only when in a team the caller manages', async () => {
    qb.getExists.mockResolvedValue(false);
    await expect(service.isSelfOrManagedTeamMember(1, 2)).resolves.toBe(false);
    expect(qb.innerJoin).toHaveBeenCalledWith('team_members', 'mgr', expect.stringContaining('mgr.role = :role'), {
      callerId: 1,
      role: 'manager',
    });
    qb.getExists.mockResolvedValue(true);
    await expect(service.isSelfOrManagedTeamMember(1, 2)).resolves.toBe(true);
  });

  it('findAssignableUsers returns de-duplicated summaries without private fields or the caller', async () => {
    const u = { id: 2, username: 'bob', name: 'Bob', avatarUrl: null, email: 'bob@x.com' };
    const me = { id: 1, username: 'me', name: 'Me', avatarUrl: null };
    qb.getMany.mockResolvedValue([{ user: u }, { user: u }, { user: me }]);
    await expect(service.findAssignableUsers(1)).resolves.toEqual([
      { id: 2, username: 'bob', name: 'Bob', avatarUrl: null },
    ]);
  });

  // Add more tests for service methods here
});
