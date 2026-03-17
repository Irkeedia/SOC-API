import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, Min, Max, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BodyMaterial, HeadMaterial, DollGender } from '@prisma/client';

export class CreateDollDto {
  @ApiProperty({ example: 'Sophia Laurent' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: 'WM Doll' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ enum: DollGender, default: 'FEMME' })
  @IsOptional()
  @IsEnum(DollGender)
  gender?: DollGender;

  @ApiPropertyOptional({ example: '2024-06-15T00:00:00.000Z', description: 'Date d\'acquisition' })
  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  // Apparence
  @ApiPropertyOptional({ example: 'Naturelle' })
  @IsOptional()
  @IsString()
  skinTone?: string;

  @ApiPropertyOptional({ example: 'Bleu' })
  @IsOptional()
  @IsString()
  eyeColor?: string;

  @ApiPropertyOptional({ example: 'Blond' })
  @IsOptional()
  @IsString()
  hairColor?: string;

  @ApiPropertyOptional({ example: 'Long' })
  @IsOptional()
  @IsString()
  hairLength?: string;

  @ApiPropertyOptional({ example: 'Ondulé' })
  @IsOptional()
  @IsString()
  hairStyle?: string;

  // Specs physiques
  @ApiPropertyOptional({ enum: BodyMaterial, default: 'TPE' })
  @IsOptional()
  @IsEnum(BodyMaterial)
  bodyMaterial?: BodyMaterial;

  @ApiPropertyOptional({ enum: HeadMaterial, default: 'TPE' })
  @IsOptional()
  @IsEnum(HeadMaterial)
  headMaterial?: HeadMaterial;

  @ApiPropertyOptional({ example: 158 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  sizeCm?: number;

  @ApiPropertyOptional({ example: 35 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(80)
  weightKg?: number;

  @ApiPropertyOptional({ example: 86 })
  @IsOptional()
  @IsNumber()
  bustSize?: number;

  @ApiPropertyOptional({ example: 56 })
  @IsOptional()
  @IsNumber()
  waistSize?: number;

  @ApiPropertyOptional({ example: 86 })
  @IsOptional()
  @IsNumber()
  hipSize?: number;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsNumber()
  footSize?: number;

  @ApiPropertyOptional({ example: 'Oreilles elfiques, tatouage bras droit' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  features?: string;

  // Entretien initial
  @ApiPropertyOptional({ description: 'La doll a déjà été entretenue (met le compteur à 0)' })
  @IsOptional()
  @IsBoolean()
  initialMaintenanceDone?: boolean;

  @ApiPropertyOptional({ description: 'Liste des actions d\'entretien déjà effectuées', example: ['LAVAGE', 'POUDRAGE'] })
  @IsOptional()
  @IsString({ each: true })
  initialActions?: string[];
}

export class UpdateDollDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ enum: DollGender })
  @IsOptional()
  @IsEnum(DollGender)
  gender?: DollGender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skinTone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eyeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hairColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hairLength?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hairStyle?: string;

  @ApiPropertyOptional({ enum: BodyMaterial })
  @IsOptional()
  @IsEnum(BodyMaterial)
  bodyMaterial?: BodyMaterial;

  @ApiPropertyOptional({ enum: HeadMaterial })
  @IsOptional()
  @IsEnum(HeadMaterial)
  headMaterial?: HeadMaterial;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sizeCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bustSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  waistSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hipSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  footSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  features?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPremiumAsset?: boolean;
}

export class AddWardrobeItemDto {
  @ApiProperty({ example: 'Robe Bleue' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Robe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 'Noir' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ example: 'Soie' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  material?: string;

  @ApiPropertyOptional({ example: 'Courte' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  length?: string;

  @ApiPropertyOptional({ example: 'Dior' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'Détails personnalisés...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL d\'image invalide' })
  imageUrl?: string;
}

export class UpdateWardrobeItemDto {
  @ApiPropertyOptional({ example: 'Robe Bleue' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Robe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 'Noir' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ example: 'Soie' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  material?: string;

  @ApiPropertyOptional({ example: 'Courte' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  length?: string;

  @ApiPropertyOptional({ example: 'Dior' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'Détails personnalisés...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsUrl({}, { message: 'URL d\'image invalide' })
  imageUrl?: string;
}
