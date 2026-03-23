import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DollsService } from './dolls.service';
import {
  CreateDollDto,
  UpdateDollDto,
  AddWardrobeItemDto,
  UpdateWardrobeItemDto,
} from './dto/doll.dto';

@ApiTags('Dolls')
@Controller('dolls')
export class DollsController {
  constructor(private readonly dollsService: DollsService) {}

  // === CRUD Dolls ===

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle Doll (SOC Identity)' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateDollDto) {
    return this.dollsService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister mes Dolls avec état de dégradation' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.dollsService.findAllByUser(userId);
  }

  @Get('public')
  @ApiOperation({ summary: 'Dolls publiques (Social Feed)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findPublic(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.dollsService.findPublicDolls(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détails d\'une Doll avec calcul de dégradation temps réel' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.dollsService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une Doll' })
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateDollDto,
  ) {
    return this.dollsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une Doll' })
  remove(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.dollsService.remove(id, userId);
  }

  // === Photos ===

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Uploader une photo pour une doll' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @Param('id') dollId: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.dollsService.uploadPhoto(dollId, userId, file, caption);
  }

  @Delete('photos/:photoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une photo' })
  removePhoto(
    @Param('photoId') photoId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dollsService.removePhoto(photoId, userId);
  }

  @Patch('photos/:photoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier la légende ou l\'ordre d\'une photo' })
  updatePhoto(
    @Param('photoId') photoId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { caption?: string; sortOrder?: number },
  ) {
    return this.dollsService.updatePhoto(photoId, userId, body);
  }

  @Patch(':id/profile-photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Définir la photo de profil d\'une doll' })
  setProfilePhoto(
    @Param('id') dollId: string,
    @CurrentUser('userId') userId: string,
    @Body('photoId') photoId: string,
  ) {
    return this.dollsService.setProfilePhoto(dollId, userId, photoId);
  }

  // === Garde-robe ===

  @Post(':id/wardrobe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter un article à la garde-robe' })
  addWardrobe(
    @Param('id') dollId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AddWardrobeItemDto,
  ) {
    return this.dollsService.addWardrobeItem(dollId, userId, dto);
  }

  @Delete('wardrobe/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retirer un article de la garde-robe' })
  removeWardrobe(
    @Param('itemId') itemId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dollsService.removeWardrobeItem(itemId, userId);
  }

  @Patch('wardrobe/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un article de la garde-robe' })
  updateWardrobe(
    @Param('itemId') itemId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateWardrobeItemDto,
  ) {
    return this.dollsService.updateWardrobeItem(itemId, userId, dto);
  }
}
