import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceAction } from '@prisma/client';

export class CreateMaintenanceRecordDto {
  @ApiProperty({ example: 'doll-uuid-here' })
  @IsString()
  dollId: string;

  @ApiProperty({ enum: MaintenanceAction })
  @IsEnum(MaintenanceAction)
  action: MaintenanceAction;

  @ApiPropertyOptional({ example: 'Lavage complet avec solution SOC Kit' })
  @IsOptional()
  @IsString()
  notes?: string;
}
