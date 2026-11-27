import { MultiUserOnly } from '../../common/decorators/multi-user-only.decorator';
import type { AuthRequest } from '../../common/auth-user';
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  Request,
} from '@nestjs/common';
import { MfaService } from '../mfa/mfa.service';
import { TeamService, UserSummary } from './team.service';
import { TeamAccessService } from './team-access.service';
import { Team } from './team.entity';
import { orConflict } from '../../common/db-errors';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@MultiUserOnly()
@Controller('teams')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly teamAccess: TeamAccessService,
    private readonly mfa: MfaService,
  ) {}

  @Get()
  async findAll(@Request() req: AuthRequest): Promise<Team[]> {
    return this.teamService.findAll(req.user.userId);
  }

  /** Members of the teams the caller manages: who they can assign tasks to. Declared before ':id'. */
  @Get('assignable-users')
  async assignableUsers(@Request() req: AuthRequest): Promise<UserSummary[]> {
    return this.teamService.findAssignableUsers(req.user.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: AuthRequest): Promise<Team> {
    await this.teamAccess.assertView(req.user, Number(id));
    const team = await this.teamService.findById(Number(id));
    if (!team) throw new NotFoundException();
    return team;
  }

  @Post()
  async create(@Body() body: CreateTeamDto, @Request() req: AuthRequest): Promise<Team> {
    return orConflict(this.teamService.create({ ...body }, req.user.userId), 'You already have a team with that name');
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: UpdateTeamDto, @Request() req: AuthRequest): Promise<Team> {
    await this.teamAccess.assertManage(req.user, Number(id));
    // Whoever requires 2FA from others shows it works by using it (and cannot lock themselves out by mistake).
    if (body.requireMfa === true && !(await this.mfa.isEnabled(req.user.userId))) {
      throw new BadRequestException('Turn on two-factor authentication for your own account first');
    }
    const updated = await this.teamService.update(Number(id), { ...body });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    await this.teamAccess.assertManage(req.user, Number(id));
    return this.teamService.remove(Number(id));
  }
}
