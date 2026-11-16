import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { NodeStatus } from '../../node/node.entity';

/** Due-date presets a saved filter can use (resolved to real dates when the filter is applied). */
export const DUE_PRESETS = ['overdue', 'today', 'week', 'month', 'none'] as const;
export type DuePreset = (typeof DUE_PRESETS)[number];

/**
 * What a saved filter stores. A fixed shape, validated (unknown keys are rejected by the global
 * ValidationPipe), so the column never fills up with arbitrary JSON. The task list maps these
 * onto the /tasks query parameters.
 */
export class FilterCriteriaDto {
  @IsOptional() @IsEnum(NodeStatus)
  status?: NodeStatus;

  @IsOptional() @IsInt() @Min(0) @Max(5)
  priority?: number;

  @IsOptional() @IsInt() @Min(1)
  projectId?: number;

  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsIn(DUE_PRESETS as unknown as string[])
  due?: DuePreset;

  /** Leave out finished tasks. */
  @IsOptional() @IsBoolean()
  hideDone?: boolean;
}
