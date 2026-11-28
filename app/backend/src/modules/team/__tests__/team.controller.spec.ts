import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from '../team.controller';
import { TeamService } from '../team.service';
import { TeamAccessService } from '../team-access.service';
import { MfaService } from '../../mfa/mfa.service';
import { UserRole } from '../../user/user-role.enum';
import type { AuthRequest } from '../../../common/auth-user';
import { asMock } from '../../../common/__tests__/test-utils';
import { NodeAccessService } from '../../node/node-access.service';

describe('TeamController', () => {
  let controller: TeamController;
  const teams = {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(async () => ({ id: 3 })),
    findAssignableUsers: jest.fn(async () => [
      { id: 6, username: 'cid', name: null },
      { id: 7, username: 'dee', name: null },
    ]),
  };
  const access = {
    assertRead: jest.fn(async () => undefined),
    level: jest.fn(async (uid: number) => (uid === 6 ? 1 : 0)),
  };
  const mfa = { isEnabled: jest.fn(async () => false) };
  const req = asMock<AuthRequest>({ user: { userId: 5, username: 'bob', role: UserRole.USER } });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        { provide: TeamService, useValue: teams },
        { provide: TeamAccessService, useValue: { assertView: jest.fn(), assertManage: jest.fn() } },
        { provide: MfaService, useValue: mfa },
        { provide: NodeAccessService, useValue: access },
      ],
    }).compile();
    controller = module.get<TeamController>(TeamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('a manager without 2FA cannot require it from the team', async () => {
    await expect(controller.update(3, { requireMfa: true }, req)).rejects.toThrow(BadRequestException);
    expect(teams.update).not.toHaveBeenCalled();
  });

  it('a manager with 2FA can require it; switching it off needs nothing', async () => {
    mfa.isEnabled.mockResolvedValueOnce(true);
    await controller.update(3, { requireMfa: true }, req);
    expect(teams.update).toHaveBeenCalledWith(3, { requireMfa: true });
    await controller.update(3, { requireMfa: false }, req);
    expect(teams.update).toHaveBeenLastCalledWith(3, { requireMfa: false });
  });

  it('assignable-users lists every managed member without a node', async () => {
    const res = await controller.assignableUsers({}, req);
    expect(res.map((u) => u.id)).toEqual([6, 7]);
    expect(access.level).not.toHaveBeenCalled();
  });

  it('assignable-users with a node keeps only people who can read it, after checking the caller can', async () => {
    const res = await controller.assignableUsers({ nodeId: 40 }, req);
    expect(access.assertRead).toHaveBeenCalledWith(5, 40);
    expect(res.map((u) => u.id)).toEqual([6]);
  });
});
