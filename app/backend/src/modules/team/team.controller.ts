import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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
  async findById(@Param('id') id: number): Promise<Team | null> {
    return this.teamService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Team>): Promise<Team> {
    return this.teamService.create(body);
  }
}
