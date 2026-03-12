import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueType, BodyZone, IssueSeverity, IssueStatus } from '@prisma/client';

export class CreateIssueDto {
  @ApiProperty({ description: 'ID de la doll concernée' })
  @IsString()
  dollId: string;

  @ApiProperty({ enum: IssueType, example: 'FISSURE' })
  @IsEnum(IssueType)
  type: IssueType;

  @ApiProperty({ enum: BodyZone, example: 'BRAS_GAUCHE' })
  @IsEnum(BodyZone)
  bodyZone: BodyZone;

  @ApiProperty({ example: 'Fissure bras gauche coude' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: IssueSeverity, default: 'LEGERE' })
  @IsOptional()
  @IsEnum(IssueSeverity)
  severity?: IssueSeverity;

  @ApiPropertyOptional({ example: 'Fissure de 2cm au niveau du coude gauche, apparue après stockage' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Appliquer de la colle TPE + chaleur' })
  @IsOptional()
  @IsString()
  repairPlan?: string;

  @ApiPropertyOptional({ example: 25.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repairCost?: number;
}

export class UpdateIssueDto {
  @ApiPropertyOptional({ enum: IssueStatus })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @ApiPropertyOptional({ enum: IssueSeverity })
  @IsOptional()
  @IsEnum(IssueSeverity)
  severity?: IssueSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Ce que vous comptez faire pour réparer' })
  @IsOptional()
  @IsString()
  repairPlan?: string;

  @ApiPropertyOptional({ description: 'Ce qui a été fait (notes de réparation)' })
  @IsOptional()
  @IsString()
  repairNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  repairCost?: number;
}
