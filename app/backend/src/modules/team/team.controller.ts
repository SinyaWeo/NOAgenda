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
  Query,
  Request,
} from '@nestjs/common';
import { MfaService } from '../mfa/mfa.service';
import { TeamService, UserSummary } from './team.service';
import { TeamAccessService } from './team-access.service';
import { Team } from './team.entity';
import { orConflict } from '../../common/db-errors';
import { AssignableUsersQueryDto, CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { Access, NodeAccessService } from '../node/node-access.service';

@MultiUserOnly()
@Controller('teams')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly teamAccess: TeamAccessService,
    private readonly mfa: MfaService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(@Request() req: AuthRequest): Promise<Team[]> {
    return this.teamService.findAll(req.user.userId);
  }

  /**
   * Members of the teams the caller manages: who they can assign tasks to. With `nodeId` (a project
   * task, or the parent of a new one) only those who can already read it: assignment never opens a
   * project to anyone. Declared before ':id'.
   */
  @Get('assignable-users')
  async assignableUsers(@Query() q: AssignableUsersQueryDto, @Request() req: AuthRequest): Promise<UserSummary[]> {
    const users = await this.teamService.findAssignableUsers(req.user.userId);
    if (q.nodeId === undefined) return users;
    await this.access.assertRead(req.user.userId, q.nodeId);
    const nodeId = q.nodeId;
    const levels = await Promise.all(users.map((u) => this.access.level(u.id, nodeId)));
    return users.filter((_, i) => levels[i] >= Access.READ);
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
