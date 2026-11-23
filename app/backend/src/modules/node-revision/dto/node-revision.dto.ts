import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RevisionQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nodeId!: number;

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
