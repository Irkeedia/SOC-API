import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Patch,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard, RequireScopes } from './api-key.guard';
import { AnalyticsB2BService } from './analytics-b2b.service';
import { SnapshotService } from './snapshot.service';

// ═══════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS — protégés par JWT (admin SOC uniquement)
// ═══════════════════════════════════════════════════════════

@Controller('analytics/admin')
@UseGuards(JwtAuthGuard)
export class AnalyticsAdminController {
  constructor(
    private analyticsB2B: AnalyticsB2BService,
    private snapshots: SnapshotService,
  ) {}

  // ─── Snapshots ───

  @Post('snapshots/trigger')
  async triggerSnapshot() {
    const snapshot = await this.snapshots.takeDailySnapshot();
    const brandCount = await this.snapshots.generateBrandReports();
    return { snapshot, brandReportsGenerated: brandCount };
  }

  @Get('snapshots')
  async getSnapshots(
    @Query('period') period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY',
    @Query('limit') limit?: string,
  ) {
    return this.snapshots.getSnapshotHistory(period, limit ? parseInt(limit, 10) : 90);
  }

  @Get('snapshots/brands/:brand')
  async getBrandSnapshots(
    @Param('brand') brand: string,
    @Query('limit') limit?: string,
  ) {
    return this.snapshots.getBrandHistory(brand, limit ? parseInt(limit, 10) : 30);
  }

  // ─── Gestion partenaires ───

  @Post('partners')
  async createPartner(@Body() body: {
    companyName: string;
    contactEmail: string;
    contactName?: string;
    phone?: string;
    website?: string;
    accessLevel?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
    monthlyFee?: number;
  }) {
    return this.analyticsB2B.createPartner(body);
  }

  @Get('partners')
  async listPartners(@Query('all') all?: string) {
    return this.analyticsB2B.listPartners(all !== 'true');
  }

  @Get('partners/:id')
  async getPartner(@Param('id') id: string) {
    return this.analyticsB2B.getPartner(id);
  }

  @Patch('partners/:id')
  async updatePartner(
    @Param('id') id: string,
    @Body() body: Partial<{
      companyName: string;
      contactEmail: string;
      accessLevel: string;
      isActive: boolean;
      monthlyFee: number;
      notes: string;
    }>,
  ) {
    return this.analyticsB2B.updatePartner(id, body);
  }

  // ─── Gestion clés API ───

  @Post('partners/:id/keys')
  async generateApiKey(
    @Param('id') partnerId: string,
    @Body() body: {
      label?: string;
      scopes?: string[];
      rateLimit?: number;
      expiresInDays?: number;
    },
  ) {
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86400000)
      : undefined;

    return this.analyticsB2B.generateApiKey(
      partnerId,
      body.label,
      body.scopes,
      body.rateLimit,
      expiresAt,
    );
  }

  @Patch('keys/:keyId/revoke')
  async revokeApiKey(@Param('keyId') keyId: string) {
    return this.analyticsB2B.revokeApiKey(keyId);
  }

  // ─── Audit trail ───

  @Get('exports')
  async getExportHistory(
    @Query('partnerId') partnerId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsB2B.getExportHistory(
      partnerId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  // ─── Rapports admin (preview) ───

  @Get('reports/global')
  async previewGlobalReport(@Req() req: any) {
    return this.analyticsB2B.getGlobalReport(req.user?.sub ?? 'admin');
  }

  @Get('reports/brands')
  async previewAllBrands(@Req() req: any) {
    return this.analyticsB2B.getBrandReport(null, req.user?.sub ?? 'admin');
  }

  @Get('reports/brands/:brand')
  async previewBrandReport(@Param('brand') brand: string, @Req() req: any) {
    return this.analyticsB2B.getBrandReport(brand, req.user?.sub ?? 'admin');
  }

  @Get('reports/failures')
  async previewFailureAnalysis(@Req() req: any) {
    return this.analyticsB2B.getFailureAnalysis(req.user?.sub ?? 'admin');
  }

  @Get('reports/materials')
  async previewMaterialDurability(@Req() req: any) {
    return this.analyticsB2B.getMaterialDurabilityReport(req.user?.sub ?? 'admin');
  }

  @Get('reports/trends')
  async previewMarketTrends(
    @Query('months') months?: string,
    @Req() req?: any,
  ) {
    return this.analyticsB2B.getMarketTrends(
      months ? parseInt(months, 10) : 6,
      req.user?.sub ?? 'admin',
    );
  }
}

// ═══════════════════════════════════════════════════════════
//  B2B API — protégé par clé API (partenaires commerciaux)
// ═══════════════════════════════════════════════════════════

@Controller('analytics/b2b')
@UseGuards(ApiKeyGuard)
export class AnalyticsB2BController {
  constructor(private analyticsB2B: AnalyticsB2BService) {}

  @Get('global')
  @RequireScopes('GLOBAL_STATS')
  async getGlobalReport(@Req() req: any) {
    return this.analyticsB2B.getGlobalReport(
      req.partner.partnerId,
      req.partner.partnerId,
    );
  }

  @Get('brands')
  @RequireScopes('BRAND_REPORTS')
  async getAllBrandReports(@Req() req: any) {
    return this.analyticsB2B.getBrandReport(
      null,
      req.partner.partnerId,
      req.partner.partnerId,
      req.partner.accessLevel,
    );
  }

  @Get('brands/:brand')
  @RequireScopes('BRAND_REPORTS')
  async getBrandReport(@Param('brand') brand: string, @Req() req: any) {
    return this.analyticsB2B.getBrandReport(
      brand,
      req.partner.partnerId,
      req.partner.partnerId,
      req.partner.accessLevel,
    );
  }

  @Get('failures')
  @RequireScopes('FAILURE_ANALYSIS')
  async getFailureAnalysis(@Req() req: any) {
    return this.analyticsB2B.getFailureAnalysis(
      req.partner.partnerId,
      req.partner.partnerId,
    );
  }

  @Get('materials')
  @RequireScopes('MATERIAL_ANALYSIS')
  async getMaterialDurability(@Req() req: any) {
    return this.analyticsB2B.getMaterialDurabilityReport(
      req.partner.partnerId,
      req.partner.partnerId,
    );
  }

  @Get('trends')
  @RequireScopes('MARKET_INTELLIGENCE')
  async getMarketTrends(
    @Query('months') months?: string,
    @Req() req?: any,
  ) {
    return this.analyticsB2B.getMarketTrends(
      months ? parseInt(months, 10) : 6,
      req.partner.partnerId,
      req.partner.partnerId,
    );
  }

  /** Export CSV d'un rapport de marque */
  @Get('brands/:brand/csv')
  @RequireScopes('BRAND_REPORTS')
  async getBrandReportCsv(
    @Param('brand') brand: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const report = await this.analyticsB2B.getBrandReport(
      brand,
      req.partner.partnerId,
      req.partner.partnerId,
      req.partner.accessLevel,
    );

    if (!report.reports.length) {
      res.status(404).json({ message: 'Aucun rapport pour cette marque' });
      return;
    }

    const r = report.reports[0];
    const csvData = [
      { metric: 'brand', value: r.brand },
      { metric: 'total_dolls', value: r.volume.totalDolls },
      { metric: 'market_share_percent', value: r.volume.marketSharePercent },
      { metric: 'total_issues', value: r.failures.totalIssues },
      { metric: 'failure_rate', value: r.failures.failureRate },
      { metric: 'avg_days_to_first_issue', value: r.failures.avgDaysToFirstIssue },
      { metric: 'avg_maintenance_per_doll', value: r.maintenance.avgPerDoll },
      { metric: 'avg_degradation', value: r.conditions.avgDegradation },
      { metric: 'avg_size_cm', value: r.morphology.avgSizeCm },
      { metric: 'avg_weight_kg', value: r.morphology.avgWeightKg },
      { metric: 'avg_likes', value: r.popularity.avgLikes },
      { metric: 'avg_views', value: r.popularity.avgViews },
      { metric: 'durability_score', value: r.durabilityScore },
    ];

    const csv = this.analyticsB2B.exportToCsv(csvData, ['metric', 'value']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="soc-brand-report-${brand}-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }
}
