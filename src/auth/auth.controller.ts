import { Controller, Post, Body, Get, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ auth: { ttl: 60000, limit: 5 } })  // 5 inscriptions / minute max par IP
  @ApiOperation({ summary: 'Créer un nouveau compte SOC' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ auth: { ttl: 60000, limit: 10 } })  // 10 tentatives login / minute par IP
  @ApiOperation({ summary: 'Se connecter' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('magic-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer un magic link pour ouvrir le site web connecté' })
  @ApiQuery({ name: 'siteUrl', required: false, description: 'URL du site (défaut: https://www.silenceofceleste.com)' })
  getMagicLink(
    @Req() req: any,
    @Query('siteUrl') siteUrl?: string,
  ) {
    const { userId, email } = req.user;
    const url = siteUrl || 'https://www.silenceofceleste.com';
    return this.authService.generateMagicLink(userId, email, url);
  }
}
