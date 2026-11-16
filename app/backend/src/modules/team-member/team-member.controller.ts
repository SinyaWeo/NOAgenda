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
import { TeamMember } from './team-member.entity';
import { AddTeamMemberDto } from './dto/team-member.dto';

@Controller('team-members')
export class TeamMemberController {
  constructor(
    private readonly teamMemberService: TeamMemberService,
    private readonly teamService: TeamService,
  ) {}

  @Get()
  async findAll(@Query('teamId') teamId?: string, @Request() req?: any): Promise<TeamMember[]> {
    if (teamId) {
      // Verify caller is owner or member of this team
      const team = await this.teamService.findById(Number(teamId));
      if (!team) throw new NotFoundException();
      const accessibleTeams = await this.teamService.findAll(req.user.userId);
      if (!accessibleTeams.some((t) => t.id === Number(teamId))) throw new ForbiddenException();
    }
    if (teamId) return this.teamMemberService.findAll(Number(teamId));
    // Without a teamId filter, scope to teams the caller owns or belongs to (filtered in SQL)
    const accessibleTeams = await this.teamService.findAll(req.user.userId);
    return this.teamMemberService.findByTeamIds(accessibleTeams.map((t) => t.id));
  }

  @Post()
  async add(@Body() body: AddTeamMemberDto, @Request() req: any): Promise<TeamMember> {
    const team = await this.teamService.findById(body.teamId);
    if (!team) throw new NotFoundException();
    if (team.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.teamMemberService.add(body.userId, body.teamId);
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const member = await this.teamMemberService.findById(id);
    if (!member) throw new NotFoundException();
    const team = await this.teamService.findById(member.team?.id);
    if (!team) throw new NotFoundException();
    if (team.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.teamMemberService.remove(id);
  }
}
