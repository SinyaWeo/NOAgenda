import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { asMock, authReq, Mocks } from '../../../common/__tests__/test-utils';
import { Access, NodeAccessService } from '../../node/node-access.service';
import { ActivityController } from '../activity.controller';
import { ActivityService } from '../activity.service';

describe('ActivityController', () => {
  let activity: Mocks;
  let access: Mocks;
  let ctrl: ActivityController;
  const page = { items: [], next: null };

  beforeEach(() => {
    activity = {
      forNode: jest.fn(async () => page),
      forProject: jest.fn(async () => page),
      mine: jest.fn(async () => page),
    };
    access = { assertRead: jest.fn(), assertProject: jest.fn() };
    ctrl = new ActivityController(asMock<ActivityService>(activity), asMock<NodeAccessService>(access));
  });

  it('a node feed needs read access to the node', async () => {
    await ctrl.list({ nodeId: 5 }, authReq(2));
    expect(access.assertRead).toHaveBeenCalledWith(2, 5);
    expect(activity.forNode).toHaveBeenCalledWith(5, undefined, undefined);
  });

  it('a denied node feed returns nothing', async () => {
    access.assertRead.mockRejectedValue(new ForbiddenException());
    await expect(ctrl.list({ nodeId: 5 }, authReq(2))).rejects.toBeInstanceOf(ForbiddenException);
    expect(activity.forNode).not.toHaveBeenCalled();
  });

  it('a project feed needs read access to the project', async () => {
    await ctrl.list({ projectId: 10, before: 50, limit: 10 }, authReq(2));
    expect(access.assertProject).toHaveBeenCalledWith(2, 10, Access.READ);
    expect(activity.forProject).toHaveBeenCalledWith(10, 50, 10);
  });

  it("scope=mine is the caller's own feed and checks nothing else", async () => {
    await ctrl.list({ scope: 'mine' }, authReq(4));
    expect(activity.mine).toHaveBeenCalledWith(4, undefined, undefined);
  });

  it('requires exactly one of nodeId, projectId, scope', async () => {
    await expect(ctrl.list({}, authReq(2))).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctrl.list({ nodeId: 1, projectId: 2 }, authReq(2))).rejects.toBeInstanceOf(BadRequestException);
  });
});
