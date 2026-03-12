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
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate Limiting : max 100 requêtes / 60 secondes par IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

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
  ],
  controllers: [HealthController],
  providers: [
    // Appliquer le rate limiting globalement
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
