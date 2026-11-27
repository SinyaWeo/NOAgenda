import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** The password, or, when the account has 2FA on, a code from the authenticator app. */
export class StepUpDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code?: string;
}
