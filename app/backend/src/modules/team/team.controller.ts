import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { Team } from './team.entity';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async findAll(@Request() req: AuthRequest): Promise<Team[]> {
    return this.teamService.findAll(req.user.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: AuthRequest): Promise<Team> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    // Only the owner or a member may view a team.
    const mine = await this.teamService.findAll(req.user.userId);
    if (!mine.some((t) => t.id === Number(id))) throw new ForbiddenException();
    return team;
  }

  @Post()
  async create(@Body() body: CreateTeamDto, @Request() req: AuthRequest): Promise<Team> {
    const data = { ...body };
    return this.teamService.create({ ...data, ownerId: req.user.userId });
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: UpdateTeamDto, @Request() req: AuthRequest): Promise<Team> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    if (team.ownerId !== req.user.userId) throw new ForbiddenException();
    const updated = await this.teamService.update(id, { ...body });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    if (team.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.teamService.remove(id);
  }
}
