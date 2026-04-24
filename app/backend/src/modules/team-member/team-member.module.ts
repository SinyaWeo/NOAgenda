import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMember } from './team-member.entity';
import { TeamMemberService } from './team-member.service';
import { TeamMemberController } from './team-member.controller';
import { UserModule } from '../user/user.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember]), UserModule, TeamModule],
  providers: [TeamMemberService],
  controllers: [TeamMemberController],
  exports: [TeamMemberService],
})
export class TeamMemberModule {}
