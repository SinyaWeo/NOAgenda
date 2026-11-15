import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApiTokenDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsOptional() @IsDateString()
  expiresAt?: string;
}
