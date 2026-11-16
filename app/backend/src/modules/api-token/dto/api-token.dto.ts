import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /** 'read' (default) = GET only; 'write' = may also change data. Neither can use admin endpoints. */
  @IsOptional()
  @IsIn(['read', 'write'])
  scope?: 'read' | 'write';

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
