import { Injectable } from '@nestjs/common';
import { Doll, MaintenanceStage, BodyMaterial } from '@prisma/client';

/**
 * Service de calcul de dégradation multi-étapes (Axe I).
 * 
 * Logique : Plus le temps depuis le dernier lavage est long,
 * plus la dégradation progresse par étapes successives.
 * Le TPE se dégrade plus vite que le silicone.
 */
@Injectable()
export class DegradationService {
  // Seuils en heures depuis le dernier lavage
  private readonly THRESHOLDS = {
    TPE: {
      SECHAGE_RECOMMANDE: 48,
      HUMIDITE_STAGNANTE: 96,
      POUDRAGE_NECESSAIRE: 168,       // 1 semaine
      PROLIFERATION_BACTERIENNE: 336,  // 2 semaines
      FRAGILISATION_STRUCTURE: 672,    // 4 semaines
      INTERVENTION_URGENTE: 1344,      // 8 semaines
    },
    SILICONE: {
      SECHAGE_RECOMMANDE: 72,
      HUMIDITE_STAGNANTE: 144,
      POUDRAGE_NECESSAIRE: 336,
      PROLIFERATION_BACTERIENNE: 672,
      FRAGILISATION_STRUCTURE: 1344,
      INTERVENTION_URGENTE: 2688,
    },
  };

  /**
   * Calcule le stage de dégradation et le niveau (0-100)
   * en fonction du temps écoulé depuis le dernier lavage.
   */
  computeDegradation(doll: Pick<Doll, 'lastWashedAt' | 'bodyMaterial' | 'fissureCount'>): {
    stage: MaintenanceStage;
    level: number;
    message: string;
  } {
    if (!doll.lastWashedAt) {
      // Doll neuve sans historique -> état neuf, pas de pénalité
      return {
        stage: MaintenanceStage.OPTIMAL,
        level: 0,
        message: 'Nouvelle doll — premier entretien à planifier.',
      };
    }

    const hoursSinceWash = this.hoursSince(doll.lastWashedAt);
    const materialKey = doll.bodyMaterial === BodyMaterial.SILICONE ? 'SILICONE' : 'TPE';
    const thresholds = this.THRESHOLDS[materialKey];

    // Bonus malus fissures
    const fissurePenalty = (doll.fissureCount || 0) * 5;

    let stage: MaintenanceStage;
    let baseLevel: number;
    let message: string;

    if (hoursSinceWash >= thresholds.INTERVENTION_URGENTE) {
      stage = MaintenanceStage.INTERVENTION_URGENTE;
      baseLevel = 95;
      message = '⚠️ Intervention urgente requise. Risque de dommages irréversibles.';
    } else if (hoursSinceWash >= thresholds.FRAGILISATION_STRUCTURE) {
      stage = MaintenanceStage.FRAGILISATION_STRUCTURE;
      baseLevel = 80;
      message = 'Structure fragilisée. Entretien professionnel recommandé.';
    } else if (hoursSinceWash >= thresholds.PROLIFERATION_BACTERIENNE) {
      stage = MaintenanceStage.PROLIFERATION_BACTERIENNE;
      baseLevel = 60;
      message = 'Risque bactérien détecté. Nettoyage et désinfection nécessaires.';
    } else if (hoursSinceWash >= thresholds.POUDRAGE_NECESSAIRE) {
      stage = MaintenanceStage.POUDRAGE_NECESSAIRE;
      baseLevel = 40;
      message = 'Poudrage nécessaire pour protéger la surface.';
    } else if (hoursSinceWash >= thresholds.HUMIDITE_STAGNANTE) {
      stage = MaintenanceStage.HUMIDITE_STAGNANTE;
      baseLevel = 25;
      message = 'Humidité stagnante détectée. Séchage complet recommandé.';
    } else if (hoursSinceWash >= thresholds.SECHAGE_RECOMMANDE) {
      stage = MaintenanceStage.SECHAGE_RECOMMANDE;
      baseLevel = 10;
      message = 'Séchage recommandé après le dernier lavage.';
    } else {
      stage = MaintenanceStage.OPTIMAL;
      baseLevel = 0;
      message = 'Tout est en ordre.';
    }

    const level = Math.min(100, baseLevel + fissurePenalty);
    return { stage, level, message };
  }

  private hoursSince(date: Date): number {
    return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  }
}
