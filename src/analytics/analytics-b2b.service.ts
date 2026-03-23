import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnonymizationService } from './anonymization.service';
import { SnapshotService } from './snapshot.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AnalyticsB2BService {
  private readonly logger = new Logger(AnalyticsB2BService.name);

  constructor(
    private prisma: PrismaService,
    private anonymization: AnonymizationService,
    private snapshots: SnapshotService,
  ) {}

  // ═══════════════════════════════════════════════════════
  //  GESTION DES PARTENAIRES
  // ═══════════════════════════════════════════════════════

  async createPartner(data: {
    companyName: string;
    contactEmail: string;
    contactName?: string;
    phone?: string;
    website?: string;
    accessLevel?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
    monthlyFee?: number;
    contractStart?: Date;
    contractEnd?: Date;
    notes?: string;
  }) {
    return this.prisma.analytics_partners.create({ data: data as any });
  }

  async listPartners(activeOnly = true) {
    return this.prisma.analytics_partners.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { api_keys: { select: { id: true, keyPrefix: true, label: true, scopes: true, isActive: true, lastUsedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartner(partnerId: string) {
    return this.prisma.analytics_partners.findUnique({
      where: { id: partnerId },
      include: {
        api_keys: { select: { id: true, keyPrefix: true, label: true, scopes: true, isActive: true, lastUsedAt: true, createdAt: true } },
        exports: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  async updatePartner(partnerId: string, data: Partial<{
    companyName: string;
    contactEmail: string;
    accessLevel: string;
    isActive: boolean;
    monthlyFee: number;
    contractEnd: Date;
    notes: string;
  }>) {
    return this.prisma.analytics_partners.update({
      where: { id: partnerId },
      data: data as any,
    });
  }

  // ═══════════════════════════════════════════════════════
  //  GESTION DES CLÉS API
  // ═══════════════════════════════════════════════════════

  /**
   * Génère une clé API pour un partenaire.
   * Retourne la clé en clair UNE SEULE FOIS — ensuite seul le hash est stocké.
   */
  async generateApiKey(
    partnerId: string,
    label = 'default',
    scopes: string[] = ['GLOBAL_STATS'],
    rateLimit = 100,
    expiresAt?: Date,
  ): Promise<{ apiKey: string; keyId: string; keyPrefix: string }> {
    const rawKey = `soc_ak_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 15);

    const created = await this.prisma.analytics_api_keys.create({
      data: {
        partnerId,
        keyHash,
        keyPrefix,
        label,
        scopes: scopes as any,
        rateLimit,
        expiresAt,
      },
    });

    this.logger.log(`Clé API générée pour partenaire ${partnerId} : ${keyPrefix}...`);

    return { apiKey: rawKey, keyId: created.id, keyPrefix };
  }

  /**
   * Valide une clé API et retourne le partenaire + scopes.
   */
  async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    partnerId?: string;
    partnerName?: string;
    accessLevel?: string;
    scopes?: string[];
    rateLimit?: number;
  }> {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const key = await this.prisma.analytics_api_keys.findUnique({
      where: { keyHash },
      include: { partner: true },
    });

    if (!key || !key.isActive) {
      return { valid: false };
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return { valid: false };
    }

    if (!key.partner.isActive) {
      return { valid: false };
    }

    // Mettre à jour lastUsedAt
    await this.prisma.analytics_api_keys.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true,
      partnerId: key.partnerId,
      partnerName: key.partner.companyName,
      accessLevel: key.partner.accessLevel,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
    };
  }

  async revokeApiKey(keyId: string) {
    return this.prisma.analytics_api_keys.update({
      where: { id: keyId },
      data: { isActive: false },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  RAPPORTS EXPORTABLES (anonymisés)
  // ═══════════════════════════════════════════════════════

  /**
   * Rapport global anonymisé — accessible aux partenaires BASIC+
   */
  async getGlobalReport(exportedBy: string, partnerId?: string) {
    // Prendre un snapshot frais si nécessaire
    await this.snapshots.takeDailySnapshot();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await this.prisma.analytics_snapshots.findUnique({
      where: { period_snapshotDate: { period: 'DAILY', snapshotDate: today } },
    });

    // Logger l'export
    await this.logExport({
      partnerId,
      exportedBy,
      exportType: 'GLOBAL_REPORT',
      scope: 'Statistiques globales anonymisées',
      rowCount: 1,
    });

    return {
      generatedAt: new Date().toISOString(),
      period: 'daily',
      anonymized: true,
      kAnonymityLevel: 5,
      data: snapshot?.data ?? null,
      summary: {
        totalDolls: snapshot?.totalDolls,
        totalUsers: snapshot?.totalUsers,
        totalIssues: snapshot?.totalIssues,
        totalMaintenance: snapshot?.totalMaintenance,
        avgDegradation: snapshot?.avgDegradation,
      },
    };
  }

  /**
   * Rapport par marque anonymisé — accessible aux partenaires STANDARD+
   * Un partenaire peut avoir accès à toutes les marques (ENTERPRISE)
   * ou seulement aux marques globales (STANDARD) ou la sienne (PREMIUM).
   */
  async getBrandReport(
    brand: string | null,
    exportedBy: string,
    partnerId?: string,
    accessLevel?: string,
  ) {
    // Régénérer les rapports
    await this.snapshots.generateBrandReports();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let reports: any[];

    if (brand) {
      reports = await this.prisma.analytics_brand_reports.findMany({
        where: {
          brand: brand.toLowerCase(),
          snapshotDate: today,
        },
      });
    } else {
      reports = await this.prisma.analytics_brand_reports.findMany({
        where: { snapshotDate: today },
        orderBy: { totalDolls: 'desc' },
      });
    }

    // Filtrer par k-anonymity : ne pas exposer les marques avec < 5 dolls
    const filteredReports = reports.filter((r) =>
      this.anonymization.shouldIncludeBrand(r.totalDolls),
    );

    // Anonymiser les breakdowns
    const anonymizedReports = filteredReports.map((r) => ({
      brand: r.brand,
      snapshotDate: r.snapshotDate,
      volume: {
        totalDolls: r.totalDolls,
        marketSharePercent: r.marketSharePercent,
      },
      failures: {
        totalIssues: r.totalIssues,
        failureRate: r.failureRate,
        avgDaysToFirstIssue: r.avgDaysToFirstIssue,
        byZone: this.anonymization.anonymizeJsonBreakdown(r.issuesByZone as any),
        byType: this.anonymization.anonymizeJsonBreakdown(r.issuesByType as any),
        bySeverity: this.anonymization.anonymizeJsonBreakdown(r.issuesBySeverity as any),
      },
      materials: {
        body: r.bodyMaterialBreakdown,
        head: r.headMaterialBreakdown,
      },
      maintenance: {
        avgPerDoll: r.avgMaintenancePerDoll,
        actions: r.maintenanceActions,
      },
      conditions: {
        avgDegradation: r.avgDegradation,
        skin: r.skinConditionBreakdown,
        joints: r.jointConditionBreakdown,
      },
      morphology: {
        avgSizeCm: r.avgSizeCm,
        avgWeightKg: r.avgWeightKg,
      },
      popularity: {
        avgLikes: r.avgLikeCount,
        avgViews: r.avgViewCount,
      },
      durabilityScore: r.durabilityScore,
    }));

    // Logger l'export
    await this.logExport({
      partnerId,
      exportedBy,
      exportType: 'BRAND_REPORT',
      scope: brand ? `Rapport marque: ${brand}` : 'Toutes marques',
      filters: brand ? { brand } : undefined,
      rowCount: anonymizedReports.length,
    });

    return {
      generatedAt: new Date().toISOString(),
      anonymized: true,
      kAnonymityLevel: 5,
      totalBrands: anonymizedReports.length,
      reports: anonymizedReports,
    };
  }

  /**
   * Analyse de défaillance cross-marques — le produit premium.
   * Montre les zones les + fragiles par matériau, les patterns de dégradation, etc.
   */
  async getFailureAnalysis(exportedBy: string, partnerId?: string) {
    // Issues par zone + matériau body
    const zoneByMaterial = await this.prisma.$queryRaw<
      { bodyZone: string; bodyMaterial: string; count: bigint }[]
    >`
      SELECT di."bodyZone", d."bodyMaterial"::text, COUNT(*) as count
      FROM doll_issues di
      JOIN dolls d ON di."dollId" = d.id
      GROUP BY di."bodyZone", d."bodyMaterial"
      ORDER BY count DESC
    `;

    // Sévérité par zone
    const severityByZone = await this.prisma.$queryRaw<
      { bodyZone: string; severity: string; count: bigint }[]
    >`
      SELECT "bodyZone", severity::text, COUNT(*) as count
      FROM doll_issues
      GROUP BY "bodyZone", severity
      ORDER BY "bodyZone", count DESC
    `;

    // Type d'issue par matériau
    const typeByMaterial = await this.prisma.$queryRaw<
      { type: string; bodyMaterial: string; count: bigint }[]
    >`
      SELECT di.type::text, d."bodyMaterial"::text, COUNT(*) as count
      FROM doll_issues di
      JOIN dolls d ON di."dollId" = d.id
      GROUP BY di.type, d."bodyMaterial"
      ORDER BY count DESC
    `;

    // Dégradation moyenne par marque
    const degradationByBrand = await this.prisma.dolls.groupBy({
      by: ['brand'],
      _avg: { degradationLevel: true },
      _count: { id: true },
      orderBy: { _avg: { degradationLevel: 'desc' } },
    });

    await this.logExport({
      partnerId,
      exportedBy,
      exportType: 'FAILURE_ANALYSIS',
      scope: 'Analyse de défaillance cross-marques',
      rowCount: zoneByMaterial.length + severityByZone.length + typeByMaterial.length,
    });

    return {
      generatedAt: new Date().toISOString(),
      anonymized: true,
      kAnonymityLevel: 5,
      failuresByZoneAndMaterial: this.groupCrossTab(zoneByMaterial, 'bodyZone', 'bodyMaterial'),
      severityByZone: this.groupCrossTab(severityByZone, 'bodyZone', 'severity'),
      issueTypeByMaterial: this.groupCrossTab(typeByMaterial, 'type', 'bodyMaterial'),
      degradationByBrand: degradationByBrand
        .filter((r) => r._count.id >= 5 && r.brand)
        .map((r) => ({
          brand: this.anonymization.normalizeLabel(r.brand),
          avgDegradation: Math.round((r._avg.degradationLevel ?? 0) * 10) / 10,
          dollCount: r._count.id,
        })),
    };
  }

  /**
   * Analyse de durabilité des matériaux.
   */
  async getMaterialDurabilityReport(exportedBy: string, partnerId?: string) {
    // Issues par matériau corps
    const issuesByBodyMat = await this.prisma.$queryRaw<
      { bodyMaterial: string; totalIssues: bigint; totalDolls: bigint; avgDeg: number }[]
    >`
      SELECT
        d."bodyMaterial"::text,
        COUNT(DISTINCT di.id) as "totalIssues",
        COUNT(DISTINCT d.id) as "totalDolls",
        AVG(d."degradationLevel")::float as "avgDeg"
      FROM dolls d
      LEFT JOIN doll_issues di ON di."dollId" = d.id
      GROUP BY d."bodyMaterial"
    `;

    // Maintenance par matériau
    const maintenanceByMat = await this.prisma.$queryRaw<
      { bodyMaterial: string; totalMaintenance: bigint; totalDolls: bigint }[]
    >`
      SELECT
        d."bodyMaterial"::text,
        COUNT(DISTINCT mr.id) as "totalMaintenance",
        COUNT(DISTINCT d.id) as "totalDolls"
      FROM dolls d
      LEFT JOIN maintenance_records mr ON mr."dollId" = d.id
      GROUP BY d."bodyMaterial"
    `;

    await this.logExport({
      partnerId,
      exportedBy,
      exportType: 'MATERIAL_DURABILITY',
      scope: 'Analyse durabilité matériaux',
      rowCount: issuesByBodyMat.length,
    });

    return {
      generatedAt: new Date().toISOString(),
      anonymized: true,
      bodyMaterials: issuesByBodyMat.map((r) => ({
        material: r.bodyMaterial,
        totalDolls: Number(r.totalDolls),
        totalIssues: Number(r.totalIssues),
        failureRate: Number(r.totalDolls) > 0
          ? Math.round((Number(r.totalIssues) / Number(r.totalDolls)) * 100) / 100
          : 0,
        avgDegradation: Math.round((r.avgDeg ?? 0) * 10) / 10,
      })),
      maintenanceByMaterial: maintenanceByMat.map((r) => ({
        material: r.bodyMaterial,
        totalDolls: Number(r.totalDolls),
        totalMaintenance: Number(r.totalMaintenance),
        avgMaintenancePerDoll: Number(r.totalDolls) > 0
          ? Math.round((Number(r.totalMaintenance) / Number(r.totalDolls)) * 10) / 10
          : 0,
      })),
    };
  }

  /**
   * Tendances du marché — croissance, évolution des préférences.
   */
  async getMarketTrends(
    months = 6,
    exportedBy: string,
    partnerId?: string,
  ) {
    const snapshots = await this.snapshots.getSnapshotHistory('DAILY', months * 30);

    // Agrégation par mois
    const monthlyData = new Map<string, {
      dolls: number[];
      users: number[];
      issues: number[];
      degradation: number[];
    }>();

    for (const snap of snapshots) {
      const monthKey = `${snap.snapshotDate.getFullYear()}-${String(snap.snapshotDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { dolls: [], users: [], issues: [], degradation: [] });
      }
      const m = monthlyData.get(monthKey)!;
      m.dolls.push(snap.totalDolls);
      m.users.push(snap.totalUsers);
      m.issues.push(snap.totalIssues);
      m.degradation.push(snap.avgDegradation);
    }

    const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      avgDolls: Math.round(this.avg(data.dolls) * 10) / 10,
      avgUsers: Math.round(this.avg(data.users) * 10) / 10,
      avgIssues: Math.round(this.avg(data.issues) * 10) / 10,
      avgDegradation: Math.round(this.avg(data.degradation) * 10) / 10,
    }));

    await this.logExport({
      partnerId,
      exportedBy,
      exportType: 'MARKET_TRENDS',
      scope: `Tendances marché ${months} mois`,
      rowCount: trends.length,
    });

    return {
      generatedAt: new Date().toISOString(),
      anonymized: true,
      periodMonths: months,
      trends,
    };
  }

  /**
   * Export CSV d'un rapport.
   */
  exportToCsv(data: any[], columns: string[]): string {
    const header = columns.join(',');
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col];
        if (val == null) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','),
    );
    return [header, ...rows].join('\n');
  }

  // ═══════════════════════════════════════════════════════
  //  AUDIT TRAIL RGPD
  // ═══════════════════════════════════════════════════════

  async getExportHistory(partnerId?: string, limit = 50) {
    return this.prisma.analytics_exports.findMany({
      where: partnerId ? { partnerId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { partner: { select: { companyName: true } } },
    });
  }

  // ─── Helpers privés ───

  private async logExport(data: {
    partnerId?: string;
    exportedBy: string;
    exportType: string;
    scope: string;
    filters?: any;
    rowCount: number;
    format?: string;
  }) {
    const retentionDays = 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    await this.prisma.analytics_exports.create({
      data: {
        partnerId: data.partnerId,
        exportedBy: data.exportedBy,
        exportType: data.exportType as any,
        format: (data.format as any) ?? 'JSON',
        scope: data.scope,
        filters: data.filters ?? undefined,
        rowCount: data.rowCount,
        anonymized: true,
        kAnonymityLevel: 5,
        retentionDays,
        expiresAt,
      },
    });
  }

  private groupCrossTab(
    rows: { count: bigint; [key: string]: any }[],
    rowKey: string,
    colKey: string,
  ): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const rk = row[rowKey];
      const ck = row[colKey];
      if (!result[rk]) result[rk] = {};
      result[rk][ck] = Number(row.count);
    }
    return result;
  }

  private avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}
