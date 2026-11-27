import { ForbiddenException } from '@nestjs/common';
import { asMock, authReq } from '../../../common/__tests__/test-utils';
import { Permission } from '../../project-user/project-user.entity';
import { TeamProjectsController } from '../team-projects.controller';

const req = authReq(7);

describe('TeamProjectsController', () => {
  const rows = [
    { permission: Permission.WRITE, project: { id: 10, name: 'Shared', isArchived: false } },
    { permission: Permission.READ, project: { id: 20, name: 'Hidden', isArchived: true } },
  ];

  function build(view: () => Promise<void> = async () => undefined) {
    const projectTeams = { findProjectsOfTeam: jest.fn(async () => rows) };
    const teamAccess = { assertView: jest.fn(view) };
    // The caller can open project 10 only.
    const access = { projectPermissions: jest.fn(async () => new Map([[10, Permission.ADMIN]])) };
    return {
      controller: new TeamProjectsController(asMock(projectTeams), asMock(teamAccess), asMock(access)),
      teamAccess,
    };
  }

  it("lists the team's projects the caller can open, with the team's and the caller's permission", async () => {
    const { controller, teamAccess } = build();
    await expect(controller.findAll(3, req)).resolves.toEqual([
      { id: 10, name: 'Shared', isArchived: false, permission: Permission.WRITE, access: Permission.ADMIN },
    ]);
    expect(teamAccess.assertView).toHaveBeenCalledWith(req.user, 3);
  });

  it('refuses non-members', async () => {
    const { controller } = build(async () => {
      throw new ForbiddenException();
    });
    await expect(controller.findAll(3, req)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
