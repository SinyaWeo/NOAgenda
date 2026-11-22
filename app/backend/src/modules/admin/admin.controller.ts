import { omit } from '../../common/omit';
import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Patch,
  Delete,
  HttpCode,
  BadRequestException,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Request,
  Query,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';
import { User } from '../user/user.entity';
import { AccountService } from '../account/account.service';
import { SessionService } from '../session/session.service';
import { AdminTeam, TeamService } from '../team/team.service';
import { TeamMemberService } from '../team-member/team-member.service';
import { SetTeamMemberRoleDto } from '../team-member/dto/team-member.dto';
import { TeamMember } from '../team-member/team-member.entity';
import { ActivityPage, ActivityService } from '../activity/activity.service';
import { AdminActivityQueryDto } from '../activity/dto/activity.dto';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly accounts: AccountService,
    private readonly sessions: SessionService,
    private readonly teams: TeamService,
    private readonly teamMembers: TeamMemberService,
    private readonly activity: ActivityService,
  ) {}

  /** The whole audit trail, across all projects (including deleted ones). */
  @Get('activity')
  async activityLog(@Query() q: AdminActivityQueryDto): Promise<ActivityPage> {
    const { before, limit, ...filter } = q;
    return this.activity.admin(filter, before, limit);
  }

  @Get('users')
  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    return this.userService.findAllAdmin();
  }

  @Patch('users/:id/role')
  async updateRole(
    @Param('id') id: number,
    @Body('role') role: UserRole,
    @Request() req: AuthRequest,
  ): Promise<Omit<User, 'password'>> {
    if (!Object.values(UserRole).includes(role)) {
      throw new ForbiddenException('Invalid role');
    }
    if (req.user.userId === Number(id)) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.userService.setRole(Number(id), role);
    if (!user) throw new NotFoundException();
    return omit(user, 'password');
  }

  @Patch('users/:id/lock')
  async setLocked(
    @Param('id') id: number,
    @Body('locked') locked: boolean,
    @Request() req: AuthRequest,
  ): Promise<Omit<User, 'password'>> {
    if (typeof locked !== 'boolean') throw new BadRequestException('locked must be a boolean');
    const userId = Number(id);
    if (req.user.userId === userId) throw new ForbiddenException('Cannot lock your own account');
    const user = await this.userService.setLocked(userId, locked);
    if (!user) throw new NotFoundException();
    // End every live session right away; API tokens and JWTs are also refused while locked.
    if (locked) await this.sessions.revokeAllForUser(userId);
    return omit(user, 'password');
  }

  @Delete('users/:id')
  @HttpCode(204)
  async removeUser(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const userId = Number(id);
    if (req.user.userId === userId) throw new ForbiddenException('Cannot delete your own account');
    if (!(await this.userService.findById(userId))) throw new NotFoundException();
    await this.accounts.purgeUser(userId);
  }

  /** Every team with its members and their roles. */
  @Get('teams')
  async findAllTeams(): Promise<AdminTeam[]> {
    return this.teams.findAllWithMembers();
  }

  /** Only the app admin decides who manages a team. A team keeps at least one manager. */
  @Patch('teams/:teamId/members/:memberId/role')
  async setTeamMemberRole(
    @Param('teamId') teamId: number,
    @Param('memberId') memberId: number,
    @Body() body: SetTeamMemberRoleDto,
  ): Promise<{ id: number; role: TeamMember['role'] }> {
    const member = await this.teamMembers.setRole(Number(teamId), Number(memberId), body.role);
    return { id: member.id, role: member.role };
  }
}
