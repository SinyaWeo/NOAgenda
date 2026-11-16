import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Deliberately name-only. Username/email/password changes must go through the
 * dedicated flows in user-settings.controller.ts (current-password check,
 * email re-verification, session revocation, API-token block).
 */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}
