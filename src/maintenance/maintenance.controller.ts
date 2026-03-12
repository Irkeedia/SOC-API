import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRecordDto } from './dto/maintenance.dto';

@ApiTags('Maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @ApiOperation({ summary: 'Enregistrer une action de maintenance' })
  record(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.recordMaintenance(userId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord de maintenance préventive' })
  dashboard(@CurrentUser('userId') userId: string) {
    return this.maintenanceService.getDashboard(userId);
  }

  @Get(':dollId/history')
  @ApiOperation({ summary: 'Historique de maintenance d\'une Doll' })
  history(
    @Param('dollId') dollId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.maintenanceService.getHistory(dollId, userId);
  }
}
