import { MaxBytes } from '../../../common/max-bytes';
import { IsTimeZone } from '../../../common/is-time-zone';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @MaxBytes(72)
  password!: string;

  /** The user ticked "I accept the Terms and Privacy Policy". Required when REQUIRE_TERMS_ACCEPTANCE=true. */
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;

  /** The visitor's interface language at sign-up, so the account starts in the language they were already using. */
  @IsOptional()
  @IsIn(['en', 'cs'])
  language?: string;

  /** The visitor's IANA time zone (from their browser), so dates start out in their own zone. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @IsTimeZone()
  timezone?: string;

  /** Required only when the operator set REGISTRATION_INVITE_CODE. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  inviteCode?: string;
}
