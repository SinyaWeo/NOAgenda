import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateTeamDto {
  /** Members must use two-factor authentication. Switching it on needs 2FA on your own account first. */
  @IsOptional()
  @IsBoolean()
  requireMfa?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class AssignableUsersQueryDto {
  /** Only people who can read this task or project (where being assigned would not give them access). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nodeId?: number;
}
