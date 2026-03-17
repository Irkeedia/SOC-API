import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString, MaxLength, IsIn } from 'class-validator';
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
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @IsIn(['CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE'], { message: 'Statut invalide. Valeurs acceptées : CONFIRME, EN_COURS, TERMINE, ANNULE' })
  status: string;
}
