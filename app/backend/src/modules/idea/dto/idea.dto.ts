import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class IdeaCreateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  text!: string;

  /** Optional project the idea belongs to (the creator needs read access to it). */
  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;
}

export class IdeaUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  text?: string;

  /** A project id to attach, or null to detach. */
  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number | null;
}

export class IdeaShareDto {
  @IsArray()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  teamIds!: number[];
}

export class IdeaListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number;
}

export class IdeaHistoryQueryDto {
  /** Return revisions older than this id (the previous page's `next`). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
