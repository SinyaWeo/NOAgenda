import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFilterDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @IsObject()
  filters?: Record<string, any>;
}

export class UpdateFilterDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  name?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @IsObject()
  filters?: Record<string, any>;
}
