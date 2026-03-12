import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Prendre un rendez-vous (nettoyage, gardiennage...)' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes rendez-vous' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.appointmentsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un rendez-vous' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.appointmentsService.findOne(id, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un rendez-vous' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Annuler un rendez-vous' })
  cancel(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.appointmentsService.cancel(id, userId);
  }
}
