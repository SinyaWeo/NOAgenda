import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @IsOptional() @IsString() @MaxLength(255)
  description?: string;
}

export class UpdateTeamDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(255)
  description?: string;
}
