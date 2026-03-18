import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DegradationService } from './services/degradation.service';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  CreateDollDto,
  UpdateDollDto,
  AddWardrobeItemDto,
  UpdateWardrobeItemDto,
} from './dto/doll.dto';

@Injectable()
export class DollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly degradation: DegradationService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async create(userId: string, dto: CreateDollDto) {
    // Vérifier la limite de dolls selon le plan
    const check = await this.subscriptionService.canCreateDoll(userId);
    if (!check.allowed) {
      throw new ForbiddenException(
        `Limite atteinte : ${check.currentDolls}/${check.maxDolls} dolls. Changez de plan pour en ajouter plus.`,
      );
    }

    // Si entretien initial fait, on met lastWashedAt = now pour que le compteur soit à 0
    const lastWashedAt = dto.initialMaintenanceDone ? new Date() : new Date();
    // Note: on met toujours lastWashedAt = now pour une doll neuve (elle sort du carton propre)

    const doll = await this.prisma.dolls.create({
      data: {
        ownerId: userId,
        fullName: dto.fullName,
        brand: dto.brand,
        gender: dto.gender,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        skinTone: dto.skinTone,
        eyeColor: dto.eyeColor,
        hairColor: dto.hairColor,
        hairLength: dto.hairLength,
        hairStyle: dto.hairStyle,
        bodyMaterial: dto.bodyMaterial,
        headMaterial: dto.headMaterial,
        sizeCm: dto.sizeCm,
        weightKg: dto.weightKg,
        bustSize: dto.bustSize,
        waistSize: dto.waistSize,
        hipSize: dto.hipSize,
        footSize: dto.footSize,
        features: dto.features,
        lastWashedAt: lastWashedAt,
        degradationLevel: 0,
        maintenanceStage: 'OPTIMAL',
        statusMessage: 'Tout est en ordre.',
      },
      include: { doll_photos: true, wardrobe_items: true },
    });

    // Créer les enregistrements d'entretien initial si spécifiés
    if (dto.initialActions && dto.initialActions.length > 0) {
      const validActions = [
        'LAVAGE', 'POUDRAGE', 'SECHAGE', 'REPARATION_ARTICULATION',
        'REPARATION_PEAU', 'CONTROLE_ETAT', 'DESINFECTION', 'MAQUILLAGE',
        'COIFFURE', 'HYDRATATION_TPE', 'NETTOYAGE_ORIFICES',
        'SERRAGE_ARTICULATIONS', 'PREPARATION_STOCKAGE', 'TRAITEMENT_TACHES', 'AUTRE',
      ];
      for (const action of dto.initialActions) {
        if (validActions.includes(action)) {
          await this.prisma.maintenance_records.create({
            data: {
              dollId: doll.id,
              action: action as any,
              notes: 'Entretien initial à la création',
              performedBy: `owner:${userId}`,
              degradationAfter: 0,
              stageAfter: 'OPTIMAL',
            },
          });
        }
      }
    }

    return doll;
  }

  async findAllByUser(userId: string) {
    const dolls = await this.prisma.dolls.findMany({
      where: { ownerId: userId },
      include: {
        doll_photos: { orderBy: { sortOrder: 'asc' }, take: 1 },
        _count: { select: { maintenance_records: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Recalculer la dégradation pour chaque doll
    return dolls.map((doll) => {
      const deg = this.degradation.computeDegradation(doll);
      return {
        ...doll,
        degradationLevel: deg.level,
        maintenanceStage: deg.stage,
        statusMessage: deg.message,
      };
    });
  }

  async findOne(dollId: string, userId: string) {
    const doll = await this.prisma.dolls.findUnique({
      where: { id: dollId },
      include: {
        doll_photos: { orderBy: { sortOrder: 'asc' } },
        wardrobe_items: { orderBy: { acquiredAt: 'desc' } },
        maintenance_records: { orderBy: { performedAt: 'desc' }, take: 20 },
        doll_issues: { orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] },
      },
    });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.ownerId !== userId) {
      throw new ForbiddenException('Accès non autorisé.');
    }

    // Recalculer la dégradation
    const deg = this.degradation.computeDegradation(doll);
    return {
      ...doll,
      degradationLevel: deg.level,
      maintenanceStage: deg.stage,
      statusMessage: deg.message,
    };
  }

  async update(dollId: string, userId: string, dto: UpdateDollDto) {
    const doll = await this.ensureOwnership(dollId, userId);
    return this.prisma.dolls.update({
      where: { id: dollId },
      data: dto,
    });
  }

  async remove(dollId: string, userId: string) {
    await this.ensureOwnership(dollId, userId);
    return this.prisma.dolls.delete({ where: { id: dollId } });
  }

  // === Garde-robe ===
  async addWardrobeItem(dollId: string, userId: string, dto: AddWardrobeItemDto) {
    // Vérifier accès garde-robe selon le plan
    const hasAccess = await this.subscriptionService.hasWardrobeAccess(userId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'La garde-robe est réservée aux abonnés Premium et Ultra. Changez de plan pour y accéder.',
      );
    }
    await this.ensureOwnership(dollId, userId);
    return this.prisma.wardrobe_items.create({
      data: { dollId, ...dto },
    });
  }

  async removeWardrobeItem(itemId: string, userId: string) {
    const item = await this.prisma.wardrobe_items.findUnique({
      where: { id: itemId },
      include: { dolls: { select: { ownerId: true } } },
    });
    if (!item) throw new NotFoundException('Article introuvable.');
    if (item.dolls.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.wardrobe_items.delete({ where: { id: itemId } });
  }

  async updateWardrobeItem(itemId: string, userId: string, dto: UpdateWardrobeItemDto) {
    const item = await this.prisma.wardrobe_items.findUnique({
      where: { id: itemId },
      include: { dolls: { select: { ownerId: true } } },
    });
    if (!item) throw new NotFoundException('Article introuvable.');
    if (item.dolls.ownerId !== userId) throw new ForbiddenException();

    return this.prisma.wardrobe_items.update({
      where: { id: itemId },
      data: dto,
    });
  }

  // === Dolls publiques (Social) ===
  async findPublicDolls(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.dolls.findMany({
      where: {
        users: { profileVisibility: 'PUBLIC' },
      },
      select: {
        id: true,
        fullName: true,
        brand: true,
        bodyMaterial: true,
        sizeCm: true,
        viewCount: true,
        likeCount: true,
        doll_photos: { take: 1, orderBy: { sortOrder: 'asc' } },
        users: { select: { displayName: true, reputationScore: true } },
      },
      orderBy: { likeCount: 'desc' },
      skip,
      take: limit,
    });
  }

  private async ensureOwnership(dollId: string, userId: string) {
    const doll = await this.prisma.dolls.findUnique({ where: { id: dollId } });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.ownerId !== userId) throw new ForbiddenException('Accès non autorisé.');
    return doll;
  }
}
