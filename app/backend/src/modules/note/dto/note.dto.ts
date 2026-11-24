import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class NoteCreateDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  text!: string;
}

export class NoteUpdateDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  text?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export const NOTE_TARGETS = ['project', 'task', 'idea'] as const;
export type NoteTarget = (typeof NOTE_TARGETS)[number];

export class NoteConvertDto {
  @IsIn(NOTE_TARGETS)
  to!: NoteTarget;
}
