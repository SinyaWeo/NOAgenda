import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
