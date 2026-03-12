import {
  Controller, Get, Post, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai.dto';

@ApiTags('AI Assistant')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Envoyer un message à l\'assistant IA spécialiste love dolls' })
  chat(@CurrentUser('userId') userId: string, @Body() dto: AiChatDto) {
    return this.aiService.chat(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lister mes conversations IA' })
  getConversations(@CurrentUser('userId') userId: string) {
    return this.aiService.getConversations(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Récupérer une conversation IA complète' })
  getConversation(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.aiService.getConversation(userId, id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Supprimer une conversation IA' })
  deleteConversation(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.aiService.deleteConversation(userId, id);
  }
}
