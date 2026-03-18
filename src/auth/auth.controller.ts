import { Controller, Post, Body, Get, UseGuards, Req, Query, HttpCode, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailService } from '../common/services/email.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  @Post('register')
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Créer un nouveau compte SOC' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    const verifyToken = await this.authService.createEmailVerificationToken(result.userId);
    // Envoyer l'email de vérification de manière non-bloquante
    this.emailService.sendVerificationEmail(dto.email, verifyToken, dto.displayName).catch(() => {});
    return result;
  }

  @Post('login')
  @Throttle({ auth: { ttl: 60000, limit: 10 } })  // 10 tentatives login / minute par IP
  @ApiOperation({ summary: 'Se connecter' })
  login(@Body() dto: LoginDto, @Req() req: any, @Headers('user-agent') userAgent?: string) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    return this.authService.login(dto, userAgent, ip);
  }

  @Post('refresh')
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Rafraîchir l\'access token via refresh token' })
  refresh(
    @Body('refreshToken') refreshToken: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken requis.');
    }
    return this.authService.refreshAccessToken(refreshToken, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Déconnexion globale — révoque tous les refresh tokens' })
  async logout(@Req() req: any) {
    await this.authService.revokeAllRefreshTokens(req.user.userId);
    return { message: 'Déconnecté.' };
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
    // Whitelist des URLs autorisées (anti-open-redirect)
    const allowedHosts = ['www.silenceofceleste.com', 'silenceofceleste.com'];
    let url = 'https://www.silenceofceleste.com';
    if (siteUrl) {
      try {
        const parsed = new URL(siteUrl);
        if (parsed.protocol === 'https:' && allowedHosts.includes(parsed.host)) {
          url = siteUrl;
        }
      } catch {}
    }
    return this.authService.generateMagicLink(userId, email, url);
  }

  // ─── Password & Email Verification ───────────────────────────────

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Changer son mot de passe (authentifié)' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
    this.emailService.sendPasswordChangedEmail(req.user.email).catch(() => {});
    return { message: 'Mot de passe modifié avec succès.' };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ auth: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Demander un email de réinitialisation de mot de passe' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email);
    if (result) {
      this.emailService.sendPasswordResetEmail(dto.email, result.token, result.firstName).catch(() => {});
    }
    // Anti-enumeration : toujours la même réponse
    return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Réinitialiser le mot de passe via token email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.password);
    if (result.email) {
      this.emailService.sendPasswordChangedEmail(result.email).catch(() => {});
    }
    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  @Get('verify-email')
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Vérifier l\'email via token' })
  @ApiQuery({ name: 'token', required: true })
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token requis.');
    }
    const result = await this.authService.verifyEmail(token);
    // Envoyer l'email de bienvenue
    if (result.email) {
      this.emailService.sendWelcomeEmail(result.email, result.displayName).catch(() => {});
    }
    return { message: 'Email vérifié avec succès.' };
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Throttle({ auth: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Renvoyer l\'email de vérification' })
  async resendVerification(@Req() req: any) {
    const token = await this.authService.resendVerificationEmail(req.user.userId);
    if (token) {
      this.emailService.sendVerificationEmail(req.user.email, token).catch(() => {});
    }
    return { message: 'Si votre email n\'est pas encore vérifié, un nouveau lien a été envoyé.' };
  }
}
