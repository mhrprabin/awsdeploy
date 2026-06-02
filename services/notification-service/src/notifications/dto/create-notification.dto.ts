import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsInt()
  @IsOptional()
  referenceId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  referenceType?: string;
}
