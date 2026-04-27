import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { TeamService } from './team.service';
import { Team } from './team.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any): Promise<Team[]> {
    return this.teamService.findAll(req.user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number): Promise<Team> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    return team;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Team>, @Request() req: any): Promise<Team> {
    return this.teamService.create({ ...body, ownerId: req.user.userId });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Team>, @Request() req: any): Promise<Team> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    if (team.ownerId !== req.user.userId) throw new ForbiddenException();
    // Prevent mass-assignment of ownership/identity fields
    const { id: _id, ownerId: _o, ...safeBody } = body as any;
    const updated = await this.teamService.update(id, safeBody);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    if (team.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.teamService.remove(id);
  }
}
