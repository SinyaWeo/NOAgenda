import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TeamMemberController } from '../team-member.controller';
import { TeamMemberService } from '../team-member.service';
import { TeamRole } from '../team-member.entity';
import type { TeamService } from '../../team/team.service';
import type { TeamAccessService } from '../../team/team-access.service';
import { UserRole } from '../../user/user-role.enum';
import { asMock, authReq } from '../../../common/__tests__/test-utils';
import type { Repository } from 'typeorm';
import type { TeamMember } from '../team-member.entity';

function build(target: { role: TeamRole }, managerCount = 2) {
  const member = { id: 9, team: { id: 3 }, user: { id: 7 }, ...target };
  const service = {
    findById: jest.fn(async () => member),
    remove: jest.fn(async () => undefined),
    add: jest.fn(async () => member),
    assertNotLastManager: jest.fn(async () => undefined),
  };
  const access = { assertManage: jest.fn(async () => undefined), assertView: jest.fn(async () => undefined) };
  const ctrl = new TeamMemberController(
    asMock<TeamMemberService>(service),
    asMock<TeamService>({ findAll: jest.fn(async () => []) }),
    asMock<TeamAccessService>(access),
  );
  const repo = { count: jest.fn(async () => managerCount), update: jest.fn(), findOne: jest.fn(async () => member) };
  const real = new TeamMemberService(asMock<Repository<TeamMember>>(repo));
  return { ctrl, service, access, real, repo, member };
}

describe('team member rules', () => {
  it('a manager removes a regular member after the manage check', async () => {
    const { ctrl, service, access } = build({ role: TeamRole.MEMBER });
    await ctrl.remove(9, authReq(2));
    expect(access.assertManage).toHaveBeenCalledWith(expect.objectContaining({ userId: 2 }), 3);
    expect(service.remove).toHaveBeenCalledWith(9);
  });

  it('a manager cannot remove another manager', async () => {
    const { ctrl, service } = build({ role: TeamRole.MANAGER });
    await expect(ctrl.remove(9, authReq(2))).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('the app admin can remove a manager, but never the last one', async () => {
    const { ctrl, service } = build({ role: TeamRole.MANAGER });
    await ctrl.remove(9, authReq(1, { role: UserRole.ADMIN }));
    expect(service.assertNotLastManager).toHaveBeenCalled();
    expect(service.remove).toHaveBeenCalledWith(9);
  });

  it('new members are always plain members', async () => {
    const { real } = build({ role: TeamRole.MEMBER });
    const repo = { create: jest.fn((x: object) => x), save: jest.fn(async (x: object) => x) };
    const svc = new TeamMemberService(asMock<Repository<TeamMember>>(repo));
    await svc.add(7, 3);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ role: TeamRole.MEMBER }));
    expect(real).toBeDefined();
  });

  it('the last manager cannot be demoted or removed; others can', async () => {
    const last = build({ role: TeamRole.MANAGER }, 1);
    await expect(last.real.setRole(3, 9, TeamRole.MEMBER)).rejects.toBeInstanceOf(BadRequestException);
    expect(last.repo.update).not.toHaveBeenCalled();
    const spare = build({ role: TeamRole.MANAGER }, 2);
    await spare.real.setRole(3, 9, TeamRole.MEMBER);
    expect(spare.repo.update).toHaveBeenCalledWith(9, { role: TeamRole.MEMBER });
  });

  it('promoting never needs the last-manager check', async () => {
    const m = build({ role: TeamRole.MEMBER }, 1);
    await m.real.setRole(3, 9, TeamRole.MANAGER);
    expect(m.repo.update).toHaveBeenCalledWith(9, { role: TeamRole.MANAGER });
  });
});
