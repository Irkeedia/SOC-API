import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifier si l'email existe déjà
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    return this.generateTokenResponse(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    return this.generateTokenResponse(user.id, user.email);
  }

  private generateTokenResponse(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
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
}
