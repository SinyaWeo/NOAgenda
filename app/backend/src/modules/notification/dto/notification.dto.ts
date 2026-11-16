import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;
}
