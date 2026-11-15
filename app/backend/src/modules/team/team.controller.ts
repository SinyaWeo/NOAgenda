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
  async findById(@Param('id') id: number, @Request() req: any): Promise<Team> {
    const team = await this.teamService.findById(id);
    if (!team) throw new NotFoundException();
    // Only the owner or a member may view a team.
    const mine = await this.teamService.findAll(req.user.userId);
    if (!mine.some((t) => t.id === Number(id))) throw new ForbiddenException();
    return team;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Team>, @Request() req: any): Promise<Team> {
    const { id: _i, createdAt: _c, updatedAt: _u, ownerId: _o, ...data } = body as any;
    return this.teamService.create({ ...data, ownerId: req.user.userId });
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
