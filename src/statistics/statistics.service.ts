import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  /** ─── Statistiques globales agrégées ─── */
  async getGlobalStats() {
    const [
      brands,
      bodyMaterials,
      headMaterials,
      genders,
      usages,
      issueTypes,
      issueZones,
      issueSeverities,
      maintenanceActions,
      skinConditions,
      jointConditions,
      maintenanceStages,
      morphology,
      socialEngagement,
      community,
      topBrands,
      maintenanceFrequency,
    ] = await Promise.all([
      this.getBrandDistribution(),
      this.getBodyMaterialDistribution(),
      this.getHeadMaterialDistribution(),
      this.getGenderDistribution(),
      this.getUsageDistribution(),
      this.getIssueTypeDistribution(),
      this.getIssueZoneDistribution(),
      this.getIssueSeverityDistribution(),
      this.getMaintenanceActionDistribution(),
      this.getSkinConditionDistribution(),
      this.getJointConditionDistribution(),
      this.getMaintenanceStageDistribution(),
      this.getMorphologyAverages(),
      this.getSocialEngagement(),
      this.getCommunityStats(),
      this.getTopBrands(10),
      this.getMaintenanceFrequency(),
    ]);

    return {
      brands: { top: topBrands, distribution: brands },
      materials: { body: bodyMaterials, head: headMaterials },
      genders,
      usages,
      issues: { types: issueTypes, zones: issueZones, severities: issueSeverities },
      maintenance: { actions: maintenanceActions, frequency: maintenanceFrequency },
      conditions: {
        skin: skinConditions,
        joints: jointConditions,
        stages: maintenanceStages,
      },
      morphology,
      social: socialEngagement,
      community,
    };
  }

  /** ─── Marques ─── */
  private async getBrandDistribution() {
    const result = await this.prisma.dolls.groupBy({
      by: ['brand'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    const total = result.reduce((s, r) => s + r._count.id, 0);
    return result
      .filter((r) => r.brand)
      .map((r) => ({
        label: r.brand,
        count: r._count.id,
        percent: total > 0 ? Math.round((r._count.id / total) * 1000) / 10 : 0,
      }));
  }

  private async getTopBrands(limit: number) {
    const result = await this.prisma.dolls.groupBy({
      by: ['brand'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });
    return result
      .filter((r) => r.brand)
      .map((r) => ({ label: r.brand, count: r._count.id }));
  }

  /** ─── Matériaux ─── */
  private async getBodyMaterialDistribution() {
    return this.groupByEnum('dolls', 'bodyMaterial');
  }

  private async getHeadMaterialDistribution() {
    return this.groupByEnum('dolls', 'headMaterial');
  }

  /** ─── Genre ─── */
  private async getGenderDistribution() {
    return this.groupByEnum('dolls', 'gender');
  }

  /** ─── Usage ─── */
  private async getUsageDistribution() {
    // usage is an array field — we need raw SQL to unnest
    const result = await this.prisma.$queryRaw<
      { usage: string; count: bigint }[]
    >`
      SELECT unnest(usage::"DollUsage"[]) as usage, COUNT(*) as count
      FROM dolls
      GROUP BY usage
      ORDER BY count DESC
    `;
    const total = result.reduce((s, r) => s + Number(r.count), 0);
    return result.map((r) => ({
      label: r.usage,
      count: Number(r.count),
      percent: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
    }));
  }

  /** ─── Issues / Dégradation ─── */
  private async getIssueTypeDistribution() {
    return this.groupByEnum('doll_issues', 'type');
  }

  private async getIssueZoneDistribution() {
    return this.groupByEnum('doll_issues', 'bodyZone');
  }

  private async getIssueSeverityDistribution() {
    return this.groupByEnum('doll_issues', 'severity');
  }

  /** ─── Maintenance ─── */
  private async getMaintenanceActionDistribution() {
    return this.groupByEnum('maintenance_records', 'action');
  }

  private async getMaintenanceFrequency() {
    // Average maintenance records per doll
    const dollCount = await this.prisma.dolls.count();
    const recordCount = await this.prisma.maintenance_records.count();
    const avgPerDoll = dollCount > 0 ? Math.round((recordCount / dollCount) * 10) / 10 : 0;

    // Most recent 30 days activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = await this.prisma.maintenance_records.count({
      where: { performedAt: { gte: thirtyDaysAgo } },
    });

    return {
      totalRecords: recordCount,
      totalDolls: dollCount,
      avgPerDoll,
      last30Days: recentCount,
      avgPerDollPerMonth: dollCount > 0 ? Math.round((recentCount / dollCount) * 10) / 10 : 0,
    };
  }

  /** ─── Conditions ─── */
  private async getSkinConditionDistribution() {
    return this.groupByEnum('dolls', 'skinCondition');
  }

  private async getJointConditionDistribution() {
    return this.groupByEnum('dolls', 'jointCondition');
  }

  private async getMaintenanceStageDistribution() {
    return this.groupByEnum('dolls', 'maintenanceStage');
  }

  /** ─── Morphologie ─── */
  private async getMorphologyAverages() {
    const agg = await this.prisma.dolls.aggregate({
      _avg: {
        sizeCm: true,
        weightKg: true,
        bustSize: true,
        waistSize: true,
        hipSize: true,
        footSize: true,
      },
      _min: {
        sizeCm: true,
        weightKg: true,
      },
      _max: {
        sizeCm: true,
        weightKg: true,
      },
      _count: { id: true },
    });

    return {
      totalDolls: agg._count.id,
      size: {
        avg: this.round(agg._avg.sizeCm),
        min: this.round(agg._min.sizeCm),
        max: this.round(agg._max.sizeCm),
      },
      weight: {
        avg: this.round(agg._avg.weightKg),
        min: this.round(agg._min.weightKg),
        max: this.round(agg._max.weightKg),
      },
      bust: this.round(agg._avg.bustSize),
      waist: this.round(agg._avg.waistSize),
      hips: this.round(agg._avg.hipSize),
      foot: this.round(agg._avg.footSize),
    };
  }

  /** ─── Social ─── */
  private async getSocialEngagement() {
    const [totalLikes, totalComments, mostLiked, mostCommented] = await Promise.all([
      this.prisma.social_likes.count(),
      this.prisma.social_comments.count(),
      this.prisma.dolls.findFirst({
        orderBy: { likeCount: 'desc' },
        select: { id: true, fullName: true, likeCount: true, brand: true },
      }),
      this.prisma.social_comments.groupBy({
        by: ['dollId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      }),
    ]);

    let mostCommentedDoll = null;
    if (mostCommented.length > 0) {
      const doll = await this.prisma.dolls.findUnique({
        where: { id: mostCommented[0].dollId },
        select: { id: true, fullName: true, brand: true },
      });
      mostCommentedDoll = doll
        ? { ...doll, commentCount: mostCommented[0]._count.id }
        : null;
    }

    return {
      totalLikes,
      totalComments,
      mostLiked: mostLiked
        ? { name: mostLiked.fullName, brand: mostLiked.brand, likes: mostLiked.likeCount }
        : null,
      mostCommented: mostCommentedDoll
        ? { name: mostCommentedDoll.fullName, brand: mostCommentedDoll.brand, comments: mostCommentedDoll.commentCount }
        : null,
    };
  }

  /** ─── Communauté ─── */
  private async getCommunityStats() {
    const [totalUsers, subscriptionTiers, totalDolls, totalIssues, avgDegradation] =
      await Promise.all([
        this.prisma.users.count(),
        this.prisma.users.groupBy({
          by: ['subscriptionTier'],
          _count: { id: true },
        }),
        this.prisma.dolls.count(),
        this.prisma.doll_issues.count(),
        this.prisma.dolls.aggregate({ _avg: { degradationLevel: true } }),
      ]);

    const tiers = subscriptionTiers.map((t) => ({
      label: t.subscriptionTier,
      count: t._count.id,
    }));

    return {
      totalUsers,
      totalDolls,
      totalIssues,
      avgDollsPerUser: totalUsers > 0 ? Math.round((totalDolls / totalUsers) * 10) / 10 : 0,
      avgDegradation: this.round(avgDegradation._avg.degradationLevel),
      subscriptions: tiers,
    };
  }

  /** ─── Helpers ─── */
  private async groupByEnum(model: string, field: string) {
    const result = await (this.prisma as any)[model].groupBy({
      by: [field],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    const total = result.reduce((s: number, r: any) => s + r._count.id, 0);
    return result.map((r: any) => ({
      label: r[field],
      count: r._count.id,
      percent: total > 0 ? Math.round((r._count.id / total) * 1000) / 10 : 0,
    }));
  }

  private round(val: number | null): number | null {
    return val != null ? Math.round(val * 10) / 10 : null;
  }
}
