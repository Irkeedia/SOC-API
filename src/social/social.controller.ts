import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SocialService } from './social.service';
import { CreateCommentDto, VoteAdviceDto } from './dto/social.dto';

@ApiTags('Social')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // === Commentaires ===

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Commenter une doll (5/jour pour Free)' })
  addComment(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialService.addComment(userId, dto);
  }

  @Get('comments/:dollId')
  @ApiOperation({ summary: 'Commentaires d\'une doll' })
  @ApiQuery({ name: 'page', required: false })
  getComments(
    @Param('dollId') dollId: string,
    @Query('page') page?: string,
  ) {
    return this.socialService.getComments(dollId, page ? parseInt(page) : 1);
  }

  // === Likes ===

  @Post('like/:dollId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liker / unliker une doll' })
  toggleLike(
    @CurrentUser('userId') userId: string,
    @Param('dollId') dollId: string,
  ) {
    return this.socialService.toggleLike(userId, dollId);
  }

  // === Réputation ===

  @Post('advice-vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voter pour la qualité des conseils d\'un utilisateur' })
  voteAdvice(
    @CurrentUser('userId') userId: string,
    @Body() dto: VoteAdviceDto,
  ) {
    return this.socialService.voteAdvice(userId, dto);
  }
}
