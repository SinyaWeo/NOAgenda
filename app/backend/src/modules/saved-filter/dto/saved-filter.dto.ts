import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { FilterCriteriaDto } from './filter-criteria.dto';

export class CreateFilterDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @ValidateNested() @Type(() => FilterCriteriaDto)
  filters?: FilterCriteriaDto;
}

export class UpdateFilterDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  name?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @ValidateNested() @Type(() => FilterCriteriaDto)
  filters?: FilterCriteriaDto;
}
