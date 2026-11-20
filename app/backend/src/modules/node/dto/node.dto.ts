import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
} from 'class-validator';
import { NodeStatus, NodeType, RepeatMode } from '../node.entity';

/** `{ id: 5 }` reference, the shape the UI uses for `project`. */
export class IdRefDto {
  @IsInt()
  @Min(1)
  id!: number;
}

/**
 * Fields shared by projects and tasks. Everything is optional here; the create DTOs
 * below add what each kind requires. Identity/ownership fields (id, ownerId,
 * createdBy, ...) are deliberately absent: strict validation rejects them.
 */
export class NodeCommonDto {
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsEnum(NodeStatus)
  status?: NodeStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentDone?: number;

  @IsOptional()
  @IsEnum(RepeatMode)
  repeatMode?: RepeatMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  repeatAfter?: number;

  /** WEEKLY: ISO weekdays (1 = Monday ... 7 = Sunday), comma-separated: "1,3,5". */
  @IsOptional()
  @Matches(/^[1-7](,[1-7]){0,6}$/)
  repeatWeekdays?: string;

  /** The series ends with the last occurrence due on this day. */
  @IsOptional()
  @IsDateString()
  repeatUntil?: string;

  /** Occurrences left, the current one included. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  repeatCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bucketId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  // Legacy shapes used by the UI to say "inside this project / under this task".
  @IsOptional()
  @ValidateNested()
  @Type(() => IdRefDto)
  project?: IdRefDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentTaskId?: number;
}

export class TaskCreateDto extends NodeCommonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;
}

export class TaskUpdateDto extends NodeCommonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;
}

export class ProjectCreateDto extends NodeCommonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

export class ProjectUpdateDto extends NodeCommonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}

export class NodeCreateDto extends NodeCommonDto {
  @IsEnum(NodeType)
  type!: NodeType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class NodeUpdateDto extends NodeCommonDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class NodeMoveDto {
  /** Target parent id, or null to move to the top level. */
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId!: number | null;
}

export class BulkTaskUpdateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids!: number[];

  @ValidateNested()
  @Type(() => TaskUpdateDto)
  data!: TaskUpdateDto;
}

const SORT_FIELDS = ['title', 'name', 'priority', 'status', 'dueDate', 'position', 'createdAt', 'updatedAt'] as const;
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value);

/** Shared paging/sorting. `limit` is capped so a client cannot request an unbounded page. */
export class PagedQueryDto {
  @IsOptional()
  @IsEnum(NodeStatus)
  status?: NodeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(SORT_FIELDS as unknown as string[])
  sort?: string;

  @IsOptional()
  @Transform(upper)
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class NodeListQueryDto extends PagedQueryDto {
  @IsOptional()
  @IsEnum(NodeType)
  type?: NodeType;

  /** A node id, or the literal "null" for top-level nodes. */
  @IsOptional()
  @Matches(/^(null|\d{1,12})$/)
  parentId?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  includeArchived?: string;
}

export class TaskListQueryDto extends PagedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  priority?: number;

  /** Due on or before this moment (ISO 8601). */
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  /** Due on or after this moment (ISO 8601). */
  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  /** With dueBefore: also return tasks that have no due date at all. */
  @IsOptional()
  @IsIn(['true', 'false'])
  includeUndated?: string;

  /** Leave out tasks that are done. */
  @IsOptional()
  @IsIn(['true', 'false'])
  excludeDone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentTaskId?: number;
}

export class TaskPositionDto {
  @IsNumber()
  position!: number;
}
