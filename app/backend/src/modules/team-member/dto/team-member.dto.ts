import { IsEnum, IsInt, Min } from 'class-validator';
import { TeamRole } from '../team-member.entity';

export class AddTeamMemberDto {
  @IsInt()
  @Min(1)
  userId!: number;

  @IsInt()
  @Min(1)
  teamId!: number;
}

/** Admin only: promote a member to manager or demote a manager. */
export class SetTeamMemberRoleDto {
  @IsEnum(TeamRole)
  role!: TeamRole;
}
