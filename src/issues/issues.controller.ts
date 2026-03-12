import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IssuesService } from './issues.service';
import { CreateIssueDto, UpdateIssueDto } from './dto/issue.dto';

@ApiTags('Issues')
@Controller('issues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @ApiOperation({ summary: 'Signaler un problème sur une doll' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateIssueDto) {
    return this.issuesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Tous mes signalements (toutes dolls)' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.issuesService.findAllByUser(userId);
  }

  @Get('doll/:dollId')
  @ApiOperation({ summary: 'Signalements d\'une doll spécifique' })
  findByDoll(@CurrentUser('userId') userId: string, @Param('dollId') dollId: string) {
    return this.issuesService.findByDoll(userId, dollId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un signalement' })
  findOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.issuesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un signalement (réparer, noter, changer statut)' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issuesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un signalement' })
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.issuesService.remove(userId, id);
  }
}
