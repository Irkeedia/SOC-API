import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto, UpdateIssueDto } from './dto/issue.dto';

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateIssueDto) {
    // Vérifier la propriété
    const doll = await this.prisma.doll.findUnique({ where: { id: dto.dollId } });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.ownerId !== userId) throw new ForbiddenException('Accès non autorisé.');

    const issue = await this.prisma.dollIssue.create({
      data: {
        dollId: dto.dollId,
        type: dto.type,
        bodyZone: dto.bodyZone,
        severity: dto.severity || 'LEGERE',
        title: dto.title,
        description: dto.description,
        repairPlan: dto.repairPlan,
        repairCost: dto.repairCost,
      },
    });

    // Mettre à jour le compteur de fissures si c'est une fissure
    if (dto.type === 'FISSURE') {
      await this.prisma.doll.update({
        where: { id: dto.dollId },
        data: { fissureCount: { increment: 1 } },
      });
    }

    return issue;
  }

  async findByDoll(userId: string, dollId: string) {
    const doll = await this.prisma.doll.findUnique({ where: { id: dollId } });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.ownerId !== userId) throw new ForbiddenException('Accès non autorisé.');

    return this.prisma.dollIssue.findMany({
      where: { dollId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, issueId: string) {
    const issue = await this.prisma.dollIssue.findUnique({
      where: { id: issueId },
      include: { doll: { select: { ownerId: true, fullName: true } } },
    });
    if (!issue) throw new NotFoundException('Signalement introuvable.');
    if (issue.doll.ownerId !== userId) throw new ForbiddenException('Accès non autorisé.');
    return issue;
  }

  async update(userId: string, issueId: string, dto: UpdateIssueDto) {
    const issue = await this.prisma.dollIssue.findUnique({
      where: { id: issueId },
      include: { doll: { select: { ownerId: true } } },
    });
    if (!issue) throw new NotFoundException('Signalement introuvable.');
    if (issue.doll.ownerId !== userId) throw new ForbiddenException('Accès non autorisé.');

    const data: any = { ...dto };

    // Si on marque comme réparé, enregistrer la date de résolution
    if (dto.status === 'REPARE' && issue.status !== 'REPARE') {
      data.resolvedAt = new Date();
      // Décrémenter le fissureCount si c'était une fissure
      if (issue.type === 'FISSURE') {
        await this.prisma.doll.update({
          where: { id: issue.dollId },
          data: { fissureCount: { decrement: 1 } },
        });
      }
    }

    return this.prisma.dollIssue.update({
      where: { id: issueId },
      data,
    });
  }

  async remove(userId: string, issueId: string) {
    const issue = await this.prisma.dollIssue.findUnique({
      where: { id: issueId },
      include: { doll: { select: { ownerId: true } } },
    });
    if (!issue) throw new NotFoundException('Signalement introuvable.');
    if (issue.doll.ownerId !== userId) throw new ForbiddenException('Accès non autorisé.');

    // Décrémenter le fissureCount si c'était une fissure active
    if (issue.type === 'FISSURE' && issue.status !== 'REPARE') {
      await this.prisma.doll.update({
        where: { id: issue.dollId },
        data: { fissureCount: { decrement: 1 } },
      });
    }

    return this.prisma.dollIssue.delete({ where: { id: issueId } });
  }

  async findAllByUser(userId: string) {
    return this.prisma.dollIssue.findMany({
      where: { doll: { ownerId: userId } },
      include: { doll: { select: { fullName: true, id: true } } },
      orderBy: [{ status: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
