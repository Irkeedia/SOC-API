import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DegradationService } from '../dolls/services/degradation.service';
import { CreateMaintenanceRecordDto } from './dto/maintenance.dto';
import { MaintenanceAction } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly degradation: DegradationService,
  ) {}

  /**
   * Enregistrer une action de maintenance.
   * Si c'est un lavage, met à jour lastWashedAt.
   * Recalcule la dégradation après l'action.
   */
  async recordMaintenance(userId: string, dto: CreateMaintenanceRecordDto) {
    // Vérifier ownership
    const doll = await this.prisma.doll.findUnique({
      where: { id: dto.dollId },
    });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.ownerId !== userId) throw new ForbiddenException();

    // Appliquer l'effet de l'action
    const updateData: Record<string, any> = {};

    if (
      dto.action === MaintenanceAction.LAVAGE ||
      dto.action === MaintenanceAction.DESINFECTION ||
      dto.action === MaintenanceAction.NETTOYAGE_ORIFICES
    ) {
      updateData.lastWashedAt = new Date();
    }

    if (
      dto.action === MaintenanceAction.REPARATION_ARTICULATION ||
      dto.action === MaintenanceAction.SERRAGE_ARTICULATIONS
    ) {
      updateData.jointCondition = 'BONNE';
    }

    if (
      dto.action === MaintenanceAction.REPARATION_PEAU ||
      dto.action === MaintenanceAction.TRAITEMENT_TACHES
    ) {
      updateData.skinCondition = 'BONNE';
      updateData.fissureCount = Math.max(0, (doll.fissureCount || 0) - 1);
    }

    // L'hydratation TPE améliore aussi la peau
    if (dto.action === MaintenanceAction.HYDRATATION_TPE) {
      updateData.skinCondition = 'IDEALE';
    }

    // Le contrôle d'état ne change rien physiquement mais enregistre un snapshot
    // MAQUILLAGE, COIFFURE, PREPARATION_STOCKAGE = pas d'effet maintenance, juste un log

    // Mettre à jour la doll
    const updatedDoll = await this.prisma.doll.update({
      where: { id: dto.dollId },
      data: updateData,
    });

    // Recalculer la dégradation
    const deg = this.degradation.computeDegradation(updatedDoll);

    // Mettre à jour les champs de dégradation
    await this.prisma.doll.update({
      where: { id: dto.dollId },
      data: {
        degradationLevel: deg.level,
        maintenanceStage: deg.stage,
        statusMessage: deg.message,
      },
    });

    // Créer l'enregistrement d'historique
    const record = await this.prisma.maintenanceRecord.create({
      data: {
        dollId: dto.dollId,
        action: dto.action,
        notes: dto.notes,
        performedBy: `owner:${userId}`,
        degradationAfter: deg.level,
        stageAfter: deg.stage,
      },
    });

    return {
      record,
      currentState: {
        degradationLevel: deg.level,
        maintenanceStage: deg.stage,
        statusMessage: deg.message,
      },
    };
  }

  async getHistory(dollId: string, userId: string) {
    const doll = await this.prisma.doll.findUnique({ where: { id: dollId } });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.ownerId !== userId) throw new ForbiddenException();

    return this.prisma.maintenanceRecord.findMany({
      where: { dollId },
      orderBy: { performedAt: 'desc' },
    });
  }

  /**
   * Dashboard de maintenance préventive.
   * Retourne l'état de toutes les dolls de l'utilisateur
   * avec alertes et recommandations.
   */
  async getDashboard(userId: string) {
    const dolls = await this.prisma.doll.findMany({
      where: { ownerId: userId },
      include: {
        maintenanceHistory: {
          orderBy: { performedAt: 'desc' },
          take: 1,
        },
      },
    });

    return dolls.map((doll) => {
      const deg = this.degradation.computeDegradation(doll);
      return {
        dollId: doll.id,
        fullName: doll.fullName,
        bodyMaterial: doll.bodyMaterial,
        lastWashedAt: doll.lastWashedAt,
        lastMaintenance: doll.maintenanceHistory[0] || null,
        degradationLevel: deg.level,
        maintenanceStage: deg.stage,
        statusMessage: deg.message,
        isUrgent: deg.level >= 60,
        skinCondition: doll.skinCondition,
        jointCondition: doll.jointCondition,
        fissureCount: doll.fissureCount,
      };
    });
  }
}
