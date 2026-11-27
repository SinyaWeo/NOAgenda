import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class MfaSetupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}

export class MfaCodeDto {
  /** A code from the authenticator app, or (where accepted) a recovery code. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;
}

export class MfaDisableDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;
}
