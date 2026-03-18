import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS, PlanKey } from './subscription.constants';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne les infos de plan de l'utilisateur + quotas restants.
   */
  async getUserPlan(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        aiMessageCount: true,
        aiMessageResetAt: true,
        _count: { select: { dolls: true } },
      },
    });
    if (!user) return null;

    const tier = (user.subscriptionTier || 'FREE') as PlanKey;
    const limits = PLAN_LIMITS[tier];

    // Reset mensuel si nécessaire (vérifie ici aussi)
    const now = new Date();
    let aiUsed = user.aiMessageCount;
    if (this.shouldResetAi(user.aiMessageResetAt)) {
      await this.resetAiCount(userId);
      aiUsed = 0;
    }

    return {
      tier,
      label: limits.label,
      description: limits.description,
      priceEur: limits.priceEur,
      maxDolls: limits.maxDolls,
      currentDolls: user._count.dolls,
      aiMessagesPerMonth: limits.aiMessagesPerMonth,
      aiMessagesUsed: aiUsed,
      aiMessagesRemaining: Math.max(0, limits.aiMessagesPerMonth - aiUsed),
      wardrobeAccess: limits.wardrobeAccess,
      nextResetAt: this.getNextResetDate(user.aiMessageResetAt).toISOString(),
    };
  }

  /**
   * Retourne les 3 plans disponibles.
   */
  getPlans() {
    return Object.entries(PLAN_LIMITS).map(([key, plan]) => ({
      tier: key,
      ...plan,
      features: this.getFeatures(key as PlanKey),
    }));
  }

  private getFeatures(tier: PlanKey): string[] {
    const l = PLAN_LIMITS[tier];
    const features: string[] = [];
    features.push(`${l.maxDolls} doll${l.maxDolls > 1 ? 's' : ''} maximum`);
    features.push(`${l.aiMessagesPerMonth} messages Céleste / mois`);
    if (l.wardrobeAccess) {
      features.push('Garde-robe virtuelle');
    }
    if (tier === 'PREMIUM' || tier === 'ULTRA') {
      features.push('Signalements illimités');
      features.push('Base de connaissances complète');
    }
    if (tier === 'ULTRA') {
      features.push('Support prioritaire');
      features.push('Accès anticipé aux nouveautés');
    }
    return features;
  }

  /**
   * Vérifie si le compteur IA doit être remis à zéro (reset mensuel).
   */
  shouldResetAi(resetAt: Date): boolean {
    const now = new Date();
    const reset = new Date(resetAt);
    // Reset si on est dans un nouveau mois par rapport au dernier reset
    return (
      now.getFullYear() > reset.getFullYear() ||
      (now.getFullYear() === reset.getFullYear() && now.getMonth() > reset.getMonth())
    );
  }

  /**
   * Renvoie la date du prochain reset (1er du mois suivant).
   */
  private getNextResetDate(currentReset: Date): Date {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next;
  }

  /**
   * Remet le compteur IA à 0 et met à jour la date de reset.
   */
  async resetAiCount(userId: string) {
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        aiMessageCount: 0,
        aiMessageResetAt: new Date(),
      },
    });
  }

  /**
   * Incrémente le compteur IA de l'utilisateur. 
   * Retourne { allowed: boolean, remaining: number }.
   */
  async consumeAiMessage(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, aiMessageCount: true, aiMessageResetAt: true },
    });
    if (!user) return { allowed: false, remaining: 0, limit: 0 };

    const tier = (user.subscriptionTier || 'FREE') as PlanKey;
    const limit = PLAN_LIMITS[tier].aiMessagesPerMonth;

    // Reset mensuel si nécessaire
    let count = user.aiMessageCount;
    if (this.shouldResetAi(user.aiMessageResetAt)) {
      await this.resetAiCount(userId);
      count = 0;
    }

    if (count >= limit) {
      return { allowed: false, remaining: 0, limit };
    }

    // Incrémente
    await this.prisma.users.update({
      where: { id: userId },
      data: { aiMessageCount: count + 1 },
    });

    return { allowed: true, remaining: limit - count - 1, limit };
  }

  /**
   * Vérifie si l'utilisateur peut créer une doll supplémentaire.
   */
  async canCreateDoll(userId: string): Promise<{ allowed: boolean; maxDolls: number; currentDolls: number }> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, _count: { select: { dolls: true } } },
    });
    if (!user) return { allowed: false, maxDolls: 0, currentDolls: 0 };

    const tier = (user.subscriptionTier || 'FREE') as PlanKey;
    const maxDolls = PLAN_LIMITS[tier].maxDolls;
    const currentDolls = user._count.dolls;

    return { allowed: currentDolls < maxDolls, maxDolls, currentDolls };
  }

  /**
   * Vérifie si l'utilisateur a accès à la garde-robe.
   */
  async hasWardrobeAccess(userId: string): Promise<boolean> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    if (!user) return false;
    const tier = (user.subscriptionTier || 'FREE') as PlanKey;
    return PLAN_LIMITS[tier].wardrobeAccess;
  }
}
