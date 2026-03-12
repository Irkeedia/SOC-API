import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  dollId: string;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  type: AppointmentType;

  @ApiProperty({ example: '2026-03-15T10:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: '12 rue de la Paix, 75002 Paris' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStorageService?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  storageStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  storageEndAt?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: ['CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE'] })
  @IsString()
  status: string;
}
