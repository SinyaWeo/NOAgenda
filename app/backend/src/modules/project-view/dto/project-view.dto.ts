import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ViewType } from '../project-view.entity';

export class CreateViewDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  title!: string;

  @IsOptional() @IsEnum(ViewType)
  viewType?: ViewType;
}

export class UpdateViewDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  title?: string;

  @IsOptional() @IsEnum(ViewType)
  viewType?: ViewType;
}
