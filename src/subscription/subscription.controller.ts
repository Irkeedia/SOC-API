import {
  Controller, Get, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Lister les plans disponibles (FREE, PREMIUM, ULTRA)' })
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get('me')
  @ApiOperation({ summary: 'Mon plan actuel + quotas restants' })
  getMyPlan(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.getUserPlan(userId);
  }
}
