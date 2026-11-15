import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Permission } from '../project-user.entity';

export class AddProjectUserDto {
  @IsInt() @Min(1)
  userId!: number;

  @IsOptional() @IsEnum(Permission)
  permission?: Permission;
}

export class AddProjectTeamDto {
  @IsInt() @Min(1)
  teamId!: number;

  @IsOptional() @IsEnum(Permission)
  permission?: Permission;
}

export class SetPermissionDto {
  @IsEnum(Permission)
  permission!: Permission;
}
