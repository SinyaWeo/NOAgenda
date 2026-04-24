import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TeamMemberService } from './team-member.service';
import { TeamMember } from './team-member.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('team-members')
export class TeamMemberController {
  constructor(private readonly teamMemberService: TeamMemberService) {}

  @Get()
  async findAll(): Promise<TeamMember[]> {
    return this.teamMemberService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(@Body() body: { user: any; team: any }): Promise<TeamMember> {
    return this.teamMemberService.add(body.user, body.team);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.teamMemberService.remove(id);
  }
}
