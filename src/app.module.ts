import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DollsModule } from './dolls/dolls.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { IssuesModule } from './issues/issues.module';
import { AiModule } from './ai/ai.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { EcommerceModule } from './ecommerce/ecommerce.module';
import { SocialModule } from './social/social.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { VendorsModule } from './vendors/vendors.module';
import { StatisticsModule } from './statistics/statistics.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthController } from './health.controller';
import { DailyBudgetGuard } from './common/guards/daily-budget.guard';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,

    // Rate Limiting multi-profil
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,    // 60 secondes
        limit: 60,     // 60 req/min par IP (réduit de 100)
      },
      {
        name: 'strict',
        ttl: 60000,    // 60 secondes
        limit: 5,      // 5 req/min — pour les endpoints coûteux (AI/Gemini)
      },
      {
        name: 'auth',
        ttl: 60000,    // 60 secondes
        limit: 10,     // 10 req/min — anti brute-force login/register
      },
    ]),

    PrismaModule,
    AuthModule,
    UsersModule,
    DollsModule,
    MaintenanceModule,
    IssuesModule,
    AiModule,
    AppointmentsModule,
    EcommerceModule,
    SocialModule,
    SubscriptionModule,
    VendorsModule,
    StatisticsModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Rate limiting global (profil "default")
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Budget quotidien global — coupe-circuit de sécurité
    {
      provide: APP_GUARD,
      useClass: DailyBudgetGuard,
    },
  ],
})
export class AppModule {}
