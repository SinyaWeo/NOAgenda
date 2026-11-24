import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RemoveUserQueryDto {
  /** Hand the user's projects to this user instead of deleting them. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  transferProjectsTo?: number;
}
