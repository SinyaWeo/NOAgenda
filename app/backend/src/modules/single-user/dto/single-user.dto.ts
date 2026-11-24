import { Type } from 'class-transformer';
import { Equals, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class SingleUserPreviewQueryDto {
  /** The account that would become the sole user. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;
}

export class EnableSingleUserDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  /** "A database backup was done and verified" was ticked. */
  @Equals(true, { message: 'Confirm that a database backup was done and verified' })
  backupConfirmed!: boolean;

  /** "Other users' private ideas and quick notes move to the sole user" was ticked. */
  @Equals(true, { message: "Confirm that other users' private ideas and quick notes move to the sole user" })
  privateDataConfirmed!: boolean;

  /** The sole user's username, typed in by hand. */
  @IsString()
  @MaxLength(255)
  confirmUsername!: string;
}
