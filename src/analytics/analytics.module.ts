import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnonymizationService } from './anonymization.service';
import { SnapshotService } from './snapshot.service';
import { AnalyticsB2BService } from './analytics-b2b.service';
import { ApiKeyGuard } from './api-key.guard';
import {
  AnalyticsAdminController,
  AnalyticsB2BController,
} from './analytics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsAdminController, AnalyticsB2BController],
  providers: [
    AnonymizationService,
    SnapshotService,
    AnalyticsB2BService,
    ApiKeyGuard,
  ],
  exports: [AnonymizationService, SnapshotService, AnalyticsB2BService],
})
export class AnalyticsModule {}
