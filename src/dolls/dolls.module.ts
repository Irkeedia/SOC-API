import { Module } from '@nestjs/common';
import { DollsService } from './dolls.service';
import { DollsController } from './dolls.controller';
import { DegradationService } from './services/degradation.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [DollsController],
  providers: [DollsService, DegradationService],
  exports: [DollsService, DegradationService],
})
export class DollsModule {}
