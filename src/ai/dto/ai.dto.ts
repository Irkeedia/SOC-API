import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AiMessageDto {
  @ApiProperty({ example: 'user', description: 'user ou assistant' })
  @IsString()
  role: string;

  @ApiProperty({ example: 'Comment nettoyer une doll TPE ?' })
  @IsString()
  content: string;
}

export class AiChatDto {
  @ApiProperty({ description: 'Historique de la conversation' })
  @IsArray()
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
