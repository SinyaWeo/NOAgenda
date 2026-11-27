import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}

export class LoginCodeDto {
  /** From the password step (`mfaToken` of its answer). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  mfaToken!: string;

  /** A code from the authenticator app or a recovery code. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;
}
