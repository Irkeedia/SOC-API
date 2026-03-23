import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnonymizationService } from './anonymization.service';

/**
 * Service de snapshots automatiques — capture l'état des stats
 * à intervalles réguliers pour l'analyse de tendances.
 */
@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(
    private prisma: PrismaService,
    private anonymization: AnonymizationService,
  ) {}

  /**
   * Prend un snapshot quotidien de toutes les statistiques agrégées.
   * Peut être appelé par un cron job ou manuellement par un admin.
   */
  async takeDailySnapshot(): Promise<{ id: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vérifier si un snapshot existe déjà pour aujourd'hui
    const existing = await this.prisma.analytics_snapshots.findUnique({
      where: { period_snapshotDate: { period: 'DAILY', snapshotDate: today } },
    });
    if (existing) {
      this.logger.log(`Snapshot DAILY déjà existant pour ${today.toISOString()}`);
      return { id: existing.id };
    }

    // Collecter les métriques clés
    const [totalDolls, totalUsers, totalIssues, totalMaintenance, avgDeg] =
      await Promise.all([
        this.prisma.dolls.count(),
        this.prisma.users.count(),
        this.prisma.doll_issues.count(),
        this.prisma.maintenance_records.count(),
        this.prisma.dolls.aggregate({ _avg: { degradationLevel: true } }),
      ]);

    // Collecter les distributions détaillées (anonymisées)
    const [
      brandDist,
      bodyMatDist,
      headMatDist,
      genderDist,
      issueTypeDist,
      issueZoneDist,
      issueSeverityDist,
      maintenanceActionDist,
      skinDist,
      jointDist,
      stageDist,
      subscriptionDist,
    ] = await Promise.all([
      this.getGroupBy('dolls', 'brand'),
      this.getGroupBy('dolls', 'bodyMaterial'),
      this.getGroupBy('dolls', 'headMaterial'),
      this.getGroupBy('dolls', 'gender'),
      this.getGroupBy('doll_issues', 'type'),
      this.getGroupBy('doll_issues', 'bodyZone'),
      this.getGroupBy('doll_issues', 'severity'),
      this.getGroupBy('maintenance_records', 'action'),
      this.getGroupBy('dolls', 'skinCondition'),
      this.getGroupBy('dolls', 'jointCondition'),
      this.getGroupBy('dolls', 'maintenanceStage'),
      this.getGroupBy('users', 'subscriptionTier'),
    ]);

    // Morphologie
    const morphology = await this.prisma.dolls.aggregate({
      _avg: {
        sizeCm: true,
        weightKg: true,
        bustSize: true,
        waistSize: true,
        hipSize: true,
        footSize: true,
      },
    });

    // Construire le JSON de données agrégées
    const data = {
      distributions: {
        brands: this.anonymization.anonymizeDistribution(brandDist),
        bodyMaterials: this.anonymization.anonymizeDistribution(bodyMatDist),
        headMaterials: this.anonymization.anonymizeDistribution(headMatDist),
        genders: this.anonymization.anonymizeDistribution(genderDist),
        issueTypes: this.anonymization.anonymizeDistribution(issueTypeDist),
        issueZones: this.anonymization.anonymizeDistribution(issueZoneDist),
        issueSeverities: this.anonymization.anonymizeDistribution(issueSeverityDist),
        maintenanceActions: this.anonymization.anonymizeDistribution(maintenanceActionDist),
        skinConditions: this.anonymization.anonymizeDistribution(skinDist),
        jointConditions: this.anonymization.anonymizeDistribution(jointDist),
        maintenanceStages: this.anonymization.anonymizeDistribution(stageDist),
        subscriptions: this.anonymization.anonymizeDistribution(subscriptionDist),
      },
      morphology: {
        avgSizeCm: this.round(morphology._avg.sizeCm),
        avgWeightKg: this.round(morphology._avg.weightKg),
        avgBust: this.round(morphology._avg.bustSize),
        avgWaist: this.round(morphology._avg.waistSize),
        avgHips: this.round(morphology._avg.hipSize),
        avgFoot: this.round(morphology._avg.footSize),
      },
      ratios: {
        issuesPerDoll: totalDolls > 0 ? this.round(totalIssues / totalDolls) : 0,
        maintenancePerDoll: totalDolls > 0 ? this.round(totalMaintenance / totalDolls) : 0,
        dollsPerUser: totalUsers > 0 ? this.round(totalDolls / totalUsers) : 0,
      },
    };

    const snapshot = await this.prisma.analytics_snapshots.create({
      data: {
        period: 'DAILY',
        snapshotDate: today,
        data: data as any,
        totalDolls,
        totalUsers,
        totalIssues,
        totalMaintenance,
        avgDegradation: this.round(avgDeg._avg.degradationLevel) ?? 0,
      },
    });

    this.logger.log(`Snapshot DAILY créé : ${snapshot.id}`);
    return { id: snapshot.id };
  }

  /**
   * Génère les rapports par marque (analytics_brand_reports).
   */
  async generateBrandReports(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Récupérer toutes les marques distinctes
    const brands = await this.prisma.dolls.groupBy({
      by: ['brand'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const totalDollsAll = brands.reduce((s, b) => s + b._count.id, 0);
    let reportsGenerated = 0;

    for (const brandRow of brands) {
      const brand = this.anonymization.normalizeLabel(brandRow.brand);
      if (!brand || brand === 'inconnu') continue;

      const totalDolls = brandRow._count.id;

      // Récupérer les IDs des dolls de cette marque (pour sous-requêtes)
      const dollIds = await this.prisma.dolls.findMany({
        where: { brand: { equals: brandRow.brand, mode: 'insensitive' } },
        select: { id: true },
      });
      const ids = dollIds.map((d) => d.id);

      // Issues pour cette marque
      const [issues, maintenanceCount, morphology, socialStats] = await Promise.all([
        this.prisma.doll_issues.findMany({
          where: { dollId: { in: ids } },
          select: { type: true, bodyZone: true, severity: true },
        }),
        this.prisma.maintenance_records.count({ where: { dollId: { in: ids } } }),
        this.prisma.dolls.aggregate({
          where: { brand: { equals: brandRow.brand, mode: 'insensitive' } },
          _avg: { sizeCm: true, weightKg: true, degradationLevel: true, likeCount: true, viewCount: true },
        }),
        this.prisma.dolls.aggregate({
          where: { brand: { equals: brandRow.brand, mode: 'insensitive' } },
          _avg: { likeCount: true, viewCount: true },
        }),
      ]);

      // Agrégations issues
      const issuesByZone = this.countField(issues, 'bodyZone');
      const issuesByType = this.countField(issues, 'type');
      const issuesBySeverity = this.countField(issues, 'severity');

      // Body/head material breakdown
      const bodyMats = await this.prisma.dolls.groupBy({
        by: ['bodyMaterial'],
        where: { brand: { equals: brandRow.brand, mode: 'insensitive' } },
        _count: { id: true },
      });
      const headMats = await this.prisma.dolls.groupBy({
        by: ['headMaterial'],
        where: { brand: { equals: brandRow.brand, mode: 'insensitive' } },
        _count: { id: true },
      });

      // Skin / joint condition breakdown
      const skinConds = await this.prisma.dolls.groupBy({
        by: ['skinCondition'],
        where: { brand: { equals: brandRow.brand, mode: 'insensitive' } },
        _count: { id: true },
      });
      const jointConds = await this.prisma.dolls.groupBy({
        by: ['jointCondition'],
        where: { brand: { equals: brandRow.brand, mode: 'insensitive' } },
        _count: { id: true },
      });

      // Maintenance actions breakdown
      const maintActions = await this.prisma.maintenance_records.groupBy({
        by: ['action'],
        where: { dollId: { in: ids } },
        _count: { id: true },
      });

      // Jours moyens jusqu'au premier issue
      const avgDaysToFirstIssue = await this.calcAvgDaysToFirstIssue(ids);

      // Durability score (0-100)
      const durabilityScore = this.calcDurabilityScore(
        totalDolls,
        issues.length,
        morphology._avg.degradationLevel ?? 0,
      );

      // Upsert le rapport
      await this.prisma.analytics_brand_reports.upsert({
        where: { brand_snapshotDate: { brand, snapshotDate: today } },
        update: {
          totalDolls,
          marketSharePercent: this.round((totalDolls / totalDollsAll) * 100) ?? 0,
          totalIssues: issues.length,
          failureRate: this.round(issues.length / totalDolls) ?? 0,
          avgDaysToFirstIssue,
          issuesByZone: issuesByZone as any,
          issuesByType: issuesByType as any,
          issuesBySeverity: issuesBySeverity as any,
          bodyMaterialBreakdown: this.groupByToJson(bodyMats, 'bodyMaterial') as any,
          headMaterialBreakdown: this.groupByToJson(headMats, 'headMaterial') as any,
          avgMaintenancePerDoll: this.round(maintenanceCount / totalDolls) ?? 0,
          maintenanceActions: this.groupByToJson(maintActions, 'action') as any,
          avgDegradation: this.round(morphology._avg.degradationLevel) ?? 0,
          skinConditionBreakdown: this.groupByToJson(skinConds, 'skinCondition') as any,
          jointConditionBreakdown: this.groupByToJson(jointConds, 'jointCondition') as any,
          avgSizeCm: this.round(morphology._avg.sizeCm) ?? undefined,
          avgWeightKg: this.round(morphology._avg.weightKg) ?? undefined,
          avgLikeCount: this.round(socialStats._avg.likeCount) ?? 0,
          avgViewCount: this.round(socialStats._avg.viewCount) ?? 0,
          durabilityScore,
        },
        create: {
          brand,
          snapshotDate: today,
          totalDolls,
          marketSharePercent: this.round((totalDolls / totalDollsAll) * 100) ?? 0,
          totalIssues: issues.length,
          failureRate: this.round(issues.length / totalDolls) ?? 0,
          avgDaysToFirstIssue,
          issuesByZone: issuesByZone as any,
          issuesByType: issuesByType as any,
          issuesBySeverity: issuesBySeverity as any,
          bodyMaterialBreakdown: this.groupByToJson(bodyMats, 'bodyMaterial') as any,
          headMaterialBreakdown: this.groupByToJson(headMats, 'headMaterial') as any,
          avgMaintenancePerDoll: this.round(maintenanceCount / totalDolls) ?? 0,
          maintenanceActions: this.groupByToJson(maintActions, 'action') as any,
          avgDegradation: this.round(morphology._avg.degradationLevel) ?? 0,
          skinConditionBreakdown: this.groupByToJson(skinConds, 'skinCondition') as any,
          jointConditionBreakdown: this.groupByToJson(jointConds, 'jointCondition') as any,
          avgSizeCm: this.round(morphology._avg.sizeCm) ?? undefined,
          avgWeightKg: this.round(morphology._avg.weightKg) ?? undefined,
          avgLikeCount: this.round(socialStats._avg.likeCount) ?? 0,
          avgViewCount: this.round(socialStats._avg.viewCount) ?? 0,
          durabilityScore,
        },
      });

      reportsGenerated++;
    }

    this.logger.log(`${reportsGenerated} rapports de marque générés`);
    return reportsGenerated;
  }

  /**
   * Récupère l'historique des snapshots pour l'analyse de tendances.
   */
  async getSnapshotHistory(
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY',
    limit = 90,
  ) {
    return this.prisma.analytics_snapshots.findMany({
      where: { period },
      orderBy: { snapshotDate: 'desc' },
      take: limit,
      select: {
        snapshotDate: true,
        totalDolls: true,
        totalUsers: true,
        totalIssues: true,
        totalMaintenance: true,
        avgDegradation: true,
        data: true,
      },
    });
  }

  /**
   * Récupère l'historique des rapports pour une marque spécifique.
   */
  async getBrandHistory(brand: string, limit = 30) {
    return this.prisma.analytics_brand_reports.findMany({
      where: { brand: brand.toLowerCase() },
      orderBy: { snapshotDate: 'desc' },
      take: limit,
    });
  }

  // ─── Helpers privés ───

  private async getGroupBy(
    model: string,
    field: string,
  ): Promise<{ label: string; count: number }[]> {
    const result = await (this.prisma as any)[model].groupBy({
      by: [field],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return result.map((r: any) => ({
      label: r[field] ?? 'inconnu',
      count: r._count.id,
    }));
  }

  private countField(
    items: any[],
    field: string,
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const val = item[field] ?? 'INCONNU';
      counts[val] = (counts[val] || 0) + 1;
    }
    return counts;
  }

  private groupByToJson(
    result: any[],
    field: string,
  ): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const r of result) {
      obj[r[field]] = r._count.id;
    }
    return obj;
  }

  private async calcAvgDaysToFirstIssue(dollIds: string[]): Promise<number | null> {
    if (dollIds.length === 0) return null;
    const result = await this.prisma.$queryRaw<{ avgDays: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (di."createdAt" - d."acquisitionDate")) / 86400)::float as "avgDays"
      FROM doll_issues di
      JOIN dolls d ON di."dollId" = d.id
      WHERE di."dollId" = ANY(${dollIds})
        AND di."createdAt" = (
          SELECT MIN(di2."createdAt") FROM doll_issues di2 WHERE di2."dollId" = di."dollId"
        )
    `;
    return result[0]?.avgDays ? this.round(result[0].avgDays) : null;
  }

  /**
   * Score de durabilité 0-100.
   * Plus le score est haut, plus la marque est durable.
   * Formule : 100 - (failureRate * 20) - (avgDegradation * 0.5)
   * Plafonné entre 0 et 100.
   */
  private calcDurabilityScore(
    totalDolls: number,
    totalIssues: number,
    avgDegradation: number,
  ): number {
    if (totalDolls === 0) return 0;
    const failureRate = totalIssues / totalDolls;
    const score = 100 - failureRate * 20 - avgDegradation * 0.5;
    return Math.max(0, Math.min(100, this.round(score) ?? 0));
  }

  private round(val: number | null | undefined): number | null {
    if (val == null) return null;
    return Math.round(val * 10) / 10;
  }
}
