import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class StepUpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}
