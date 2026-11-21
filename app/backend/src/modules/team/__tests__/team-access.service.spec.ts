import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamAccessService, TeamLevel } from '../team-access.service';
import { TeamRole } from '../../team-member/team-member.entity';
import { UserRole } from '../../user/user-role.enum';
import { asMock } from '../../../common/__tests__/test-utils';
import type { Repository } from 'typeorm';
import type { Team } from '../team.entity';
import type { TeamMember } from '../../team-member/team-member.entity';

function build(opts: { teamExists?: boolean; role?: TeamRole | null } = {}) {
  const teams = { exists: jest.fn(async () => opts.teamExists ?? true) };
  const members = { findOne: jest.fn(async () => (opts.role ? { role: opts.role } : null)) };
  const svc = new TeamAccessService(asMock<Repository<Team>>(teams), asMock<Repository<TeamMember>>(members));
  return { svc, members };
}
const user = { userId: 5, role: UserRole.USER };
const admin = { userId: 1, role: UserRole.ADMIN };

describe('TeamAccessService', () => {
  it('levels: outsider NONE, member MEMBER, manager MANAGER', async () => {
    await expect(build({ role: null }).svc.level(user, 3)).resolves.toBe(TeamLevel.NONE);
    await expect(build({ role: TeamRole.MEMBER }).svc.level(user, 3)).resolves.toBe(TeamLevel.MEMBER);
    await expect(build({ role: TeamRole.MANAGER }).svc.level(user, 3)).resolves.toBe(TeamLevel.MANAGER);
  });

  it('the app admin manages every team without a membership lookup', async () => {
    const { svc, members } = build({ role: null });
    await expect(svc.level(admin, 3)).resolves.toBe(TeamLevel.MANAGER);
    expect(members.findOne).not.toHaveBeenCalled();
  });

  it('view: outsider forbidden, member allowed', async () => {
    await expect(build({ role: null }).svc.assertView(user, 3)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(build({ role: TeamRole.MEMBER }).svc.assertView(user, 3)).resolves.toBeUndefined();
  });

  it('manage: member forbidden, manager and admin allowed', async () => {
    await expect(build({ role: TeamRole.MEMBER }).svc.assertManage(user, 3)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(build({ role: TeamRole.MANAGER }).svc.assertManage(user, 3)).resolves.toBeUndefined();
    await expect(build({ role: null }).svc.assertManage(admin, 3)).resolves.toBeUndefined();
  });

  it('unknown team is 404, also for the admin', async () => {
    await expect(build({ teamExists: false }).svc.assertManage(admin, 3)).rejects.toBeInstanceOf(NotFoundException);
  });
});
