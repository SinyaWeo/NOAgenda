import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TeamMemberService } from './team-member.service';
import { TeamService } from '../team/team.service';
import { TeamAccessService } from '../team/team-access.service';
import { TeamMember, TeamRole } from './team-member.entity';
import { AddTeamMemberDto } from './dto/team-member.dto';
import { UserRole } from '../user/user-role.enum';
import { orConflict } from '../../common/db-errors';

@Controller('team-members')
export class TeamMemberController {
  constructor(
    private readonly teamMemberService: TeamMemberService,
    private readonly teamService: TeamService,
    private readonly teamAccess: TeamAccessService,
  ) {}

  @Get()
  async findAll(@Query('teamId') teamId: string | undefined, @Request() req: AuthRequest): Promise<TeamMember[]> {
    if (teamId) {
      await this.teamAccess.assertView(req.user, Number(teamId));
      return this.teamMemberService.findAll(Number(teamId));
    }
    // Without a teamId filter, scope to the teams the caller belongs to (filtered in SQL)
    const accessibleTeams = await this.teamService.findAll(req.user.userId);
    return this.teamMemberService.findByTeamIds(accessibleTeams.map((t) => t.id));
  }

  /** A manager adds regular members to their own team. */
  @Post()
  async add(@Body() body: AddTeamMemberDto, @Request() req: AuthRequest): Promise<TeamMember> {
    await this.teamAccess.assertManage(req.user, body.teamId);
    return orConflict(this.teamMemberService.add(body.userId, body.teamId), 'That user is already in the team');
  }

  /** A manager removes regular members; removing a manager is up to the app admin. */
  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const member = await this.teamMemberService.findById(Number(id));
    if (!member) throw new NotFoundException();
    await this.teamAccess.assertManage(req.user, member.team.id);
    if (member.role === TeamRole.MANAGER) {
      if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('Only an admin can remove a manager');
      await this.teamMemberService.assertNotLastManager(member);
    }
    return this.teamMemberService.remove(member.id);
  }
}
