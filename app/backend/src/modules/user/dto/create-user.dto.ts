import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

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
  password!: string;

  /** The user ticked "I accept the Terms and Privacy Policy". Required when REQUIRE_TERMS_ACCEPTANCE=true. */
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;
}
