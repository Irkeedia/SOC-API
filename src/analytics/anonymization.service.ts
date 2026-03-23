import { Injectable } from '@nestjs/common';

/**
 * Service d'anonymisation RGPD pour l'export de données B2B.
 *
 * Principes :
 * - k-anonymity : aucun groupe inférieur à K_THRESHOLD éléments
 * - Aucune PII (pas d'ID utilisateur, email, nom, adresse)
 * - Agrégation uniquement : jamais de données individuelles
 * - Normalisation des labels (lowercase, trim)
 */
@Injectable()
export class AnonymizationService {
  /** Seuil minimum d'éléments pour qu'un groupe soit exporté */
  private readonly K_THRESHOLD = 5;

  /**
   * Anonymise une distribution en filtrant les groupes
   * ayant moins de K éléments (protection k-anonymity).
   *
   * Les groupes filtrés sont fusionnés dans un bucket "AUTRES".
   */
  anonymizeDistribution(
    items: { label: string; count: number; percent?: number }[],
    kThreshold?: number,
  ): { label: string; count: number; percent: number }[] {
    const k = kThreshold ?? this.K_THRESHOLD;
    const total = items.reduce((s, i) => s + i.count, 0);
    if (total === 0) return [];

    const visible: { label: string; count: number; percent: number }[] = [];
    let othersCount = 0;

    for (const item of items) {
      if (item.count >= k) {
        visible.push({
          label: this.normalizeLabel(item.label),
          count: item.count,
          percent: this.pct(item.count, total),
        });
      } else {
        othersCount += item.count;
      }
    }

    if (othersCount > 0) {
      visible.push({
        label: 'AUTRES',
        count: othersCount,
        percent: this.pct(othersCount, total),
      });
    }

    return visible;
  }

  /**
   * Anonymise un rapport par marque — ne retourne le rapport
   * que si la marque a au moins K dolls (sinon trop identifiable).
   */
  shouldIncludeBrand(totalDollsForBrand: number, kThreshold?: number): boolean {
    return totalDollsForBrand >= (kThreshold ?? this.K_THRESHOLD);
  }

  /**
   * Anonymise un objet JSON de type { "ZONE": count }
   * en appliquant le seuil k-anonymity.
   */
  anonymizeJsonBreakdown(
    data: Record<string, number>,
    kThreshold?: number,
  ): Record<string, number> {
    const k = kThreshold ?? this.K_THRESHOLD;
    const result: Record<string, number> = {};
    let othersCount = 0;

    for (const [key, value] of Object.entries(data)) {
      if (value >= k) {
        result[this.normalizeLabel(key)] = value;
      } else {
        othersCount += value;
      }
    }

    if (othersCount > 0) {
      result['AUTRES'] = othersCount;
    }

    return result;
  }

  /**
   * Supprime toute PII d'un objet.
   *  - Champs supprimés : id, odoc, email, displayName, firstName,
   *    lastName, phone, address, passwordHash, avatarUrl
   */
  stripPII<T extends Record<string, any>>(obj: T): Partial<T> {
    const piiFields = new Set([
      'id',
      'odoc',
      'ownerId',
      'userId',
      'email',
      'displayName',
      'firstName',
      'lastName',
      'phone',
      'address',
      'passwordHash',
      'avatarUrl',
      'fullName',
      'shippingAddress',
      'shippingName',
      'shippingCity',
      'shippingZip',
      'contactEmail',
      'contactName',
      'tokenHash',
      'keyHash',
    ]);

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!piiFields.has(key)) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /** Normalise un label : lowercase, trim, collapse spaces */
  normalizeLabel(label: string | null | undefined): string {
    if (!label) return 'inconnu';
    return label.trim().toLowerCase().replace(/\s+/g, '_');
  }

  /** Calcule un pourcentage arrondi à 1 décimale */
  private pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
  }
}
