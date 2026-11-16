import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  /** CSS hex colour, e.g. #6366f1 */
  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'color must be a hex colour like #6366f1' })
  color?: string;
}

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'color must be a hex colour like #6366f1' })
  color?: string;
}
