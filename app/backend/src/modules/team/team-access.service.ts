import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth-user';
import { UserRole } from '../user/user-role.enum';
import { Team } from './team.entity';
import { TeamMember, TeamRole } from '../team-member/team-member.entity';

/** What a user may do with one team, ordered. */
export enum TeamLevel {
  NONE = 0,
  MEMBER = 1,
  MANAGER = 2,
}

/**
 * Single source of truth for "who may do what with a team".
 *
 * - member: may view the team and its members.
 * - manager: additionally edits the team, adds/removes regular members and deletes the team.
 *   Only for that one team; it grants nothing on projects (those have their own permissions).
 * - app admin: manager of every team, and the only one who changes who is a manager.
 * - `teams.ownerId` (the creator) grants nothing by itself.
 */
@Injectable()
export class TeamAccessService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
  ) {}

  async level(user: Pick<AuthUser, 'userId' | 'role'>, teamId: number): Promise<TeamLevel> {
    if (user.role === UserRole.ADMIN) return TeamLevel.MANAGER;
    const row = await this.memberRepository.findOne({
      where: { team: { id: teamId }, user: { id: user.userId } },
    });
    if (!row) return TeamLevel.NONE;
    return row.role === TeamRole.MANAGER ? TeamLevel.MANAGER : TeamLevel.MEMBER;
  }

  async assert(user: Pick<AuthUser, 'userId' | 'role'>, teamId: number, needed: TeamLevel): Promise<void> {
    if (!(await this.teamRepository.exists({ where: { id: teamId } }))) throw new NotFoundException();
    if ((await this.level(user, teamId)) < needed) throw new ForbiddenException();
  }

  assertView(user: Pick<AuthUser, 'userId' | 'role'>, teamId: number) {
    return this.assert(user, teamId, TeamLevel.MEMBER);
  }
  assertManage(user: Pick<AuthUser, 'userId' | 'role'>, teamId: number) {
    return this.assert(user, teamId, TeamLevel.MANAGER);
  }
}
