import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;
}
