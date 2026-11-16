import { MaxBytes } from '../../../common/max-bytes';
import { IsTimeZone } from '../../../common/is-time-zone';
import {
  IsString, IsEmail, IsOptional, IsIn, IsInt, Min, Max, MinLength, MaxLength,
} from 'class-validator';

/** POST /user/settings/general — only these fields may be changed by the user. */
export class UpdateGeneralSettingsDto {
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  /** Interface language: the UI is translated into these. */
  @IsOptional() @IsIn(['en', 'cs'])
  language?: string;

  @IsOptional() @IsString() @MaxLength(64) @IsTimeZone()
  timezone?: string;

  /** 'system' follows the device's light/dark setting. */
  @IsOptional() @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional() @IsInt() @Min(0) @Max(6)
  weekStart?: number;

  @IsOptional() @IsInt() @Min(1)
  defaultProjectId?: number;
}

/** POST /user/settings/email */
export class UpdateEmailDto {
  @IsEmail() @MaxLength(255)
  email!: string;

  @IsString() @MaxLength(255)
  password!: string;
}

/** POST /user/settings/password */
export class UpdatePasswordDto {
  @IsString() @MaxLength(255)
  oldPassword!: string;

  @IsString() @MinLength(8) @MaxLength(255) @MaxBytes(72)
  newPassword!: string;
}

/** Deleting an account needs the current password. */
export class DeletionRequestDto {
  @IsString() @MaxLength(255)
  password!: string;
}
