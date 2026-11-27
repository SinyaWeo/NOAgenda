import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** An account created by an admin. There is no password: the user chooses one from the invite email. */
export class AdminCreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /** The language of the invite email and of the account's interface. */
  @IsOptional()
  @IsIn(['en', 'cs'])
  language?: string;
}
