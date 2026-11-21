import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './team.entity';
import { TeamMember } from '../team-member/team-member.entity';
import { TeamService } from './team.service';
import { TeamAccessService } from './team-access.service';
import { TeamController } from './team.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember])],
  providers: [TeamService, TeamAccessService],
  controllers: [TeamController],
  exports: [TeamService, TeamAccessService],
})
export class TeamModule {}
