import { IsDateString, IsEnum, IsInt, Min } from 'class-validator';
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

export class AddReminderDto {
  @IsDateString()
  reminderDate!: string;
}
