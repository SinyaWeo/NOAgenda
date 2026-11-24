import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class TransferProjectDto {
  /** The new owner (an active user). The admin's own id means "take over". */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toUserId!: number;

  /** Why: kept in the audit trail. */
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
