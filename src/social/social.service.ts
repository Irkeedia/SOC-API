import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, VoteAdviceDto } from './dto/social.dto';

// Échappement HTML simple pour les commentaires (anti-XSS stocké)
function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // === Commentaires ===

  async addComment(userId: string, dto: CreateCommentDto) {
    // Vérifier la limite Freemium (5 commentaires/jour pour Free)
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    if (user.subscriptionTier === 'FREE') {
      // Reset le compteur si c'est un nouveau jour
      const now = new Date();
      const lastReset = new Date(user.dailyCommentReset);
      if (now.toDateString() !== lastReset.toDateString()) {
        await this.prisma.users.update({
          where: { id: userId },
          data: { dailyCommentCount: 0, dailyCommentReset: now },
        });
        user.dailyCommentCount = 0;
      }

      if (user.dailyCommentCount >= 5) {
        throw new ForbiddenException(
          'Limite de 5 commentaires/jour atteinte. Passez Premium pour un accès illimité.',
        );
      }
    }

    // Vérifier que la doll est publique
    const doll = await this.prisma.dolls.findUnique({
      where: { id: dto.dollId },
      include: { users: { select: { profileVisibility: true } } },
    });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.users.profileVisibility === 'PRIVATE' && doll.ownerId !== userId) {
      throw new ForbiddenException('Cette doll n\'est pas visible publiquement.');
    }

    // Créer le commentaire et incrémenter le compteur
    const [comment] = await this.prisma.$transaction([
      this.prisma.social_comments.create({
        data: {
          userId,
          dollId: dto.dollId,
          content: sanitizeHtml(dto.content),
        },
        include: {
          users: { select: { displayName: true, avatarUrl: true, reputationScore: true } },
        },
      }),
      this.prisma.users.update({
        where: { id: userId },
        data: { dailyCommentCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }

  async getComments(dollId: string, page = 1, limit = 20) {
    return this.prisma.social_comments.findMany({
      where: { dollId },
      include: {
        users: { select: { displayName: true, avatarUrl: true, reputationScore: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // === Likes ===

  async toggleLike(userId: string, dollId: string) {
    const existing = await this.prisma.social_likes.findUnique({
      where: { userId_dollId: { userId, dollId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.social_likes.delete({ where: { id: existing.id } }),
        this.prisma.dolls.update({
          where: { id: dollId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    } else {
      await this.prisma.$transaction([
        this.prisma.social_likes.create({ data: { userId, dollId } }),
        this.prisma.dolls.update({
          where: { id: dollId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      return { liked: true };
    }
  }

  // === Réputation / Conseils ===

  async voteAdvice(voterId: string, dto: VoteAdviceDto) {
    if (voterId === dto.receiverId) {
      throw new BadRequestException('Impossible de voter pour soi-même.');
    }

    const receiver = await this.prisma.users.findUnique({
      where: { id: dto.receiverId },
    });
    if (!receiver) throw new NotFoundException('Utilisateur introuvable.');

    // Upsert le vote
    await this.prisma.advice_votes.upsert({
      where: {
        voterId_receiverId: { voterId, receiverId: dto.receiverId },
      },
      create: {
        voterId,
        receiverId: dto.receiverId,
        score: dto.score,
      },
      update: {
        score: dto.score,
      },
    });

    // Recalculer la réputation
    const aggregation = await this.prisma.advice_votes.aggregate({
      where: { receiverId: dto.receiverId },
      _avg: { score: true },
      _sum: { score: true },
      _count: { score: true },
    });

    await this.prisma.users.update({
      where: { id: dto.receiverId },
      data: {
        adviceScore: aggregation._sum.score || 0,
        adviceVotes: aggregation._count.score || 0,
        reputationScore: aggregation._avg.score || 0,
      },
    });

    return {
      receiverId: dto.receiverId,
      newReputation: aggregation._avg.score,
      totalVotes: aggregation._count.score,
    };
  }
}
