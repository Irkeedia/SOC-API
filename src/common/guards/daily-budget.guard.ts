import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * DailyBudgetGuard — Coupe-circuit de sécurité pour Railway.
 *
 * Limite le nombre TOTAL de requêtes par jour à travers toute l'API.
 * Si la limite est dépassée, retourne 503 Service Unavailable.
 *
 * Cela protège contre :
 * - Les attaques DDoS qui passeraient le rate limiting par IP
 * - Les bots qui tournent avec des IPs rotatives
 * - Toute anomalie qui ferait exploser les coûts Railway/Gemini
 *
 * Configurable via la variable d'environnement DAILY_REQUEST_BUDGET (défaut: 10000).
 * Le compteur se reset automatiquement chaque jour à minuit UTC.
 */
@Injectable()
export class DailyBudgetGuard implements CanActivate {
  private readonly logger = new Logger('DailyBudgetGuard');
  private requestCount = 0;
  private currentDay = this.getTodayKey();
  private readonly maxDailyRequests: number;
  private hasLoggedWarning = false;
  private hasLoggedShutdown = false;

  constructor() {
    this.maxDailyRequests = parseInt(process.env.DAILY_REQUEST_BUDGET || '10000', 10);
    this.logger.log(`Budget quotidien initialisé : ${this.maxDailyRequests} requêtes/jour`);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request?.url || request?.path || '';

    // Ne pas compter le health check
    if (path === '/health' || path === '/health/') {
      return true;
    }

    // Reset le compteur si on a changé de jour (UTC)
    const today = this.getTodayKey();
    if (today !== this.currentDay) {
      this.logger.log(
        `Nouveau jour (${today}). Reset du compteur (hier: ${this.requestCount} requêtes).`,
      );
      this.requestCount = 0;
      this.currentDay = today;
      this.hasLoggedWarning = false;
      this.hasLoggedShutdown = false;
    }

    this.requestCount++;

    // Alerte à 80% du budget
    if (
      !this.hasLoggedWarning &&
      this.requestCount >= this.maxDailyRequests * 0.8
    ) {
      this.logger.warn(
        `⚠️ ALERTE : 80% du budget quotidien atteint (${this.requestCount}/${this.maxDailyRequests})`,
      );
      this.hasLoggedWarning = true;
    }

    // Coupe-circuit : budget dépassé
    if (this.requestCount > this.maxDailyRequests) {
      if (!this.hasLoggedShutdown) {
        this.logger.error(
          `🛑 BUDGET QUOTIDIEN DÉPASSÉ ! ${this.requestCount}/${this.maxDailyRequests} requêtes. API en mode protection.`,
        );
        this.hasLoggedShutdown = true;
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'Budget quotidien de requêtes atteint. L\'API est temporairement indisponible. Réessayez demain.',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return true;
  }

  /** Retourne la clé du jour au format YYYY-MM-DD (UTC). */
  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Permet de récupérer les stats (utilisable par le health check). */
  getStats() {
    return {
      currentDay: this.currentDay,
      requestCount: this.requestCount,
      maxDailyRequests: this.maxDailyRequests,
      percentUsed: Math.round((this.requestCount / this.maxDailyRequests) * 100),
      isLocked: this.requestCount > this.maxDailyRequests,
    };
  }
}
