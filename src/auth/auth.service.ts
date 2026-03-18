import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { SecurityLoggerService, SecurityEvent } from '../common/services/security-logger.service';
import { ConfigService } from '@nestjs/config';

// Anti brute-force : lockout en mémoire (par email)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly securityLogger: SecurityLoggerService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifier si l'email existe déjà
    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    return this.generateTokenResponse(user.id, user.email);
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const emailKey = dto.email.toLowerCase().trim();

    // Vérifier le lockout
    const attempts = loginAttempts.get(emailKey);
    if (attempts && attempts.lockedUntil > Date.now()) {
      const remainingMin = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      this.securityLogger.log({ event: SecurityEvent.ACCOUNT_LOCKED, email: emailKey, ip, userAgent });
      throw new ForbiddenException(
        `Compte temporairement verrouillé. Réessayez dans ${remainingMin} minute(s).`,
      );
    }

    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.recordFailedAttempt(emailKey);
      this.securityLogger.log({ event: SecurityEvent.LOGIN_FAILED, email: emailKey, ip, userAgent });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.recordFailedAttempt(emailKey);
      this.securityLogger.log({ event: SecurityEvent.LOGIN_FAILED, email: emailKey, ip, userId: user.id, userAgent });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    // Login réussi : réinitialiser les tentatives
    loginAttempts.delete(emailKey);
    this.securityLogger.log({ event: SecurityEvent.LOGIN_SUCCESS, email: emailKey, ip, userId: user.id });

    return this.generateTokenResponse(user.id, user.email, userAgent);
  }

  /**
   * Rafraîchit l'access token à partir d'un refresh token valide.
   * Rotation : l'ancien refresh token est révoqué et un nouveau est émis.
   */
  async refreshAccessToken(refreshToken: string, userAgent?: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refresh_tokens.findUnique({
      where: { tokenHash },
      include: { users: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Si le token a déjà été utilisé (revokedAt set), c'est potentiellement
      // un vol de token → révoquer TOUS les refresh tokens de l'utilisateur
      if (stored?.revokedAt) {
        this.securityLogger.log({
          event: SecurityEvent.REFRESH_TOKEN_REUSE,
          userId: stored.userId,
          details: 'Possible token theft — all refresh tokens revoked',
        });
        await this.prisma.refresh_tokens.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }

    // Rotation : révoquer l'ancien
    await this.prisma.refresh_tokens.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokenResponse(stored.userId, stored.users.email, userAgent);
  }

  /**
   * Révoque tous les refresh tokens d'un utilisateur (logout global).
   */
  async revokeAllRefreshTokens(userId: string) {
    await this.prisma.refresh_tokens.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private recordFailedAttempt(email: string) {
    const current = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      current.count = 0;
    }
    loginAttempts.set(email, current);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generateTokenResponse(userId: string, email: string, userAgent?: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload);

    // Générer un refresh token opaque
    const rawRefreshToken = randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refresh_tokens.create({
      data: {
        tokenHash,
        userId,
        userAgent: userAgent?.substring(0, 255),
        expiresAt,
      },
    });

    // Nettoyage des tokens expirés/révoqués (non bloquant)
    this.prisma.refresh_tokens.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    }).catch(() => {});

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      userId,
    };
  }

  /**
   * Génère un magic link token (5 min) pour ouvrir le site web
   * avec une connexion automatique depuis l'app Flutter.
   */
  generateMagicLink(userId: string, email: string, siteUrl: string): { url: string; token: string } {
    const token = this.jwt.sign(
      { sub: userId, email, magic: true },
      { expiresIn: '5m' },
    );
    const url = `${siteUrl}/api/auth/magic?token=${encodeURIComponent(token)}`;
    return { url, token };
  }

  // ===========================================
  // CHANGE PASSWORD (utilisateur connecté)
  // ===========================================

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable.');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect.');

    if (currentPassword === newPassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.users.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Révoquer tous les refresh tokens (forcer re-connexion)
    await this.revokeAllRefreshTokens(userId);

    return { message: 'Mot de passe modifié avec succès.' };
  }

  // ===========================================
  // FORGOT PASSWORD (demande de reset)
  // ===========================================

  async forgotPassword(email: string) {
    const user = await this.prisma.users.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Même en cas d'email inexistant, on retourne le même message (anti-enumération)
    if (user) {
      // Révoquer les anciens tokens non utilisés
      await this.prisma.password_reset_tokens.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await this.prisma.password_reset_tokens.create({
        data: { tokenHash, userId: user.id, expiresAt },
      });

      // L'envoi d'email se fait côté controller (pas de dépendance email dans le service API)
      return { token: rawToken, userId: user.id, firstName: user.firstName };
    }

    return null; // Email inexistant — ne pas révéler
  }

  // ===========================================
  // RESET PASSWORD (avec token)
  // ===========================================

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);

    const stored = await this.prisma.password_reset_tokens.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Lien invalide ou expiré.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const user = await this.prisma.users.update({
      where: { id: stored.userId },
      data: { passwordHash },
    });

    await this.prisma.password_reset_tokens.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    // Révoquer tous les refresh tokens
    await this.revokeAllRefreshTokens(stored.userId);

    return { message: 'Mot de passe réinitialisé avec succès.', email: user.email };
  }

  // ===========================================
  // EMAIL VERIFICATION
  // ===========================================

  async createEmailVerificationToken(userId: string): Promise<string> {
    // Révoquer les anciens tokens
    await this.prisma.email_verification_tokens.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.prisma.email_verification_tokens.create({
      data: { tokenHash, userId, expiresAt },
    });

    return rawToken;
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);

    const stored = await this.prisma.email_verification_tokens.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }

    const user = await this.prisma.users.update({
      where: { id: stored.userId },
      data: { emailVerified: true },
    });

    await this.prisma.email_verification_tokens.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Email vérifié avec succès.', email: user.email, displayName: user.displayName };
  }

  // ===========================================
  // RESEND VERIFICATION EMAIL
  // ===========================================

  async resendVerificationEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || user.emailVerified) return null;
    return this.createEmailVerificationToken(userId);
  }
}
