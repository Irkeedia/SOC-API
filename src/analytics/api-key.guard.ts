import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AnalyticsB2BService } from './analytics-b2b.service';

/** Décorateur pour spécifier les scopes requis sur un endpoint */
export const ANALYTICS_SCOPES_KEY = 'analytics_scopes';
export const RequireScopes = (...scopes: string[]) =>
  (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(ANALYTICS_SCOPES_KEY, scopes, descriptor?.value ?? target);
    return descriptor ?? target;
  };

/**
 * Guard d'authentification par clé API pour les endpoints B2B.
 *
 * Attend un header : `X-API-Key: soc_ak_...`
 *
 * Vérifie :
 * - Clé valide et active
 * - Partenaire actif
 * - Clé non expirée
 * - Scopes suffisants
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private analyticsService: AnalyticsB2BService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException(
        'Clé API requise. Ajoutez le header X-API-Key.',
      );
    }

    const result = await this.analyticsService.validateApiKey(apiKey);

    if (!result.valid) {
      throw new UnauthorizedException(
        'Clé API invalide, expirée ou partenaire désactivé.',
      );
    }

    // Vérifier les scopes requis
    const handler = context.getHandler();
    const requiredScopes: string[] =
      Reflect.getMetadata(ANALYTICS_SCOPES_KEY, handler) ?? [];

    if (requiredScopes.length > 0) {
      const partnerScopes = result.scopes ?? [];
      const hasFullAccess = partnerScopes.includes('FULL_ACCESS');
      const hasRequired = requiredScopes.every((s) => partnerScopes.includes(s));

      if (!hasFullAccess && !hasRequired) {
        throw new ForbiddenException(
          `Scopes insuffisants. Requis : ${requiredScopes.join(', ')}`,
        );
      }
    }

    // Attacher les infos du partenaire à la request
    request.partner = {
      partnerId: result.partnerId,
      partnerName: result.partnerName,
      accessLevel: result.accessLevel,
      scopes: result.scopes,
      rateLimit: result.rateLimit,
    };

    return true;
  }
}
