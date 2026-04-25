import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { TeamService } from './team.service';
import { Team } from './team.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async findAll(): Promise<Team[]> {
    return this.teamService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Team> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    return team;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Team>): Promise<Team> {
    return this.teamService.create(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Team>): Promise<Team> {
    const team = await this.teamService.update(id, body);
    if (!team) throw new NotFoundException();
    return team;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.teamService.remove(id);
  }
}
