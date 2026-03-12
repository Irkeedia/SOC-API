import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAppointmentDto) {
    // Vérifier que la doll appartient à l'utilisateur
    const doll = await this.prisma.doll.findUnique({ where: { id: dto.dollId } });
    if (!doll) throw new NotFoundException('Doll introuvable.');
    if (doll.ownerId !== userId) throw new ForbiddenException();

    return this.prisma.appointment.create({
      data: {
        userId,
        dollId: dto.dollId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        address: dto.address,
        notes: dto.notes,
        isStorageService: dto.isStorageService || false,
        storageStartAt: dto.storageStartAt ? new Date(dto.storageStartAt) : null,
        storageEndAt: dto.storageEndAt ? new Date(dto.storageEndAt) : null,
      },
      include: {
        doll: { select: { fullName: true, brand: true } },
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      include: {
        doll: { select: { fullName: true, brand: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(appointmentId: string, userId: string) {
    const apt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doll: { select: { fullName: true, brand: true, bodyMaterial: true } },
      },
    });
    if (!apt) throw new NotFoundException('Rendez-vous introuvable.');
    if (apt.userId !== userId) throw new ForbiddenException();
    return apt;
  }

  async updateStatus(appointmentId: string, userId: string, dto: UpdateAppointmentStatusDto) {
    const apt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!apt) throw new NotFoundException();
    if (apt.userId !== userId) throw new ForbiddenException();

    const data: Record<string, any> = {
      status: dto.status as AppointmentStatus,
    };
    if (dto.status === 'TERMINE') {
      data.completedAt = new Date();
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data,
    });
  }

  async cancel(appointmentId: string, userId: string) {
    const apt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!apt) throw new NotFoundException();
    if (apt.userId !== userId) throw new ForbiddenException();

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.ANNULE },
    });
  }
}
