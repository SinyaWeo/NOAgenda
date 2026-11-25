import { IsDateString, IsEnum, IsInt, Matches, Max, Min, ValidateIf } from 'class-validator';
import { RelationKind } from '../../task-relation/task-relation.entity';

export class AddAssigneeDto {
  @IsInt()
  @Min(1)
  userId!: number;
}

export class AddTaskLabelDto {
  @IsInt()
  @Min(1)
  labelId!: number;
}

export class AddRelationDto {
  @IsInt()
  @Min(1)
  relatedTaskId!: number;

  @IsEnum(RelationKind)
  kind!: RelationKind;
}

/** A reminder at a fixed date (`reminderDate`), or relative to the due date (`daysBefore` + `atTime`). */
export class AddReminderDto {
  @ValidateIf((o: AddReminderDto) => o.daysBefore === undefined)
  @IsDateString()
  reminderDate?: string;

  @ValidateIf((o: AddReminderDto) => o.reminderDate === undefined)
  @IsInt()
  @Min(0)
  @Max(365)
  daysBefore?: number;

  @ValidateIf((o: AddReminderDto) => o.daysBefore !== undefined)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'atTime must be HH:MM' })
  atTime?: string;
}
