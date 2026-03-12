import { IsString, IsOptional, IsArray, ValidateNested, MaxLength, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AiMessageDto {
  @ApiProperty({ example: 'user', description: 'user ou assistant' })
  @IsString()
  role: string;

  @ApiProperty({ example: 'Comment nettoyer une doll TPE ?' })
  @IsString()
  @MaxLength(5000, { message: 'Le message ne peut pas dépasser 5000 caractères.' })
  content: string;
}

export class AiChatDto {
  @ApiProperty({ description: 'Historique de la conversation (50 messages max)' })
  @IsArray()
  @ArrayMaxSize(50, { message: 'L\'historique ne peut pas contenir plus de 50 messages.' })
  @ValidateNested({ each: true })
  @Type(() => AiMessageDto)
  messages: AiMessageDto[];

  @ApiPropertyOptional({ description: 'ID de conversation existante' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'ID de la doll pour contexte personnalisé' })
  @IsOptional()
  @IsString()
  dollId?: string;
}
