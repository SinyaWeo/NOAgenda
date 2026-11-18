import { asMock } from '../../../common/__tests__/test-utils';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ProjectUserService } from '../project-user.service';
import { ProjectTeamService } from '../../project-team/project-team.service';
import { TaskAssigneeService } from '../../task-assignee/task-assignee.service';

const dup = () =>
  Object.assign(new QueryFailedError('INSERT', [], new Error('dup')), { driverError: { code: 'ER_DUP_ENTRY' } });
const repo = <T>() => asMock<T>({ create: jest.fn((x) => x), save: jest.fn().mockRejectedValue(dup()) });

describe('adding something that already exists is a 409, not a 500', () => {
  it('a user to a project', async () => {
    await expect(new ProjectUserService(repo()).add(1, 2)).rejects.toBeInstanceOf(ConflictException);
  });
  it('a team to a project', async () => {
    await expect(new ProjectTeamService(repo()).add(1, 2)).rejects.toBeInstanceOf(ConflictException);
  });
  it('an assignee to a task', async () => {
    await expect(new TaskAssigneeService(repo()).add(1, 2)).rejects.toBeInstanceOf(ConflictException);
  });
});
