import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        profileVisibility: true,
        subscriptionTier: true,
        avatarUrl: true,
        darkMode: true,
        adviceScore: true,
        adviceVotes: true,
        reputationScore: true,
        createdAt: true,
        _count: { select: { dolls: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        displayName: true,
        profileVisibility: true,
        avatarUrl: true,
        darkMode: true,
      },
    });
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        profileVisibility: true,
        avatarUrl: true,
        reputationScore: true,
        adviceScore: true,
        adviceVotes: true,
        createdAt: true,
        _count: { select: { dolls: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (user.profileVisibility === 'PRIVATE') {
      return { id: user.id, displayName: user.displayName, visibility: 'PRIVATE' };
    }
    return user;
  }
}
