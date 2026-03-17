import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

/**
 * Stratégie JWT avec support de rotation de clés.
 * 
 * Variables d'environnement :
 * - JWT_SECRET         : clé active (signature + vérification)
 * - JWT_SECRET_PREVIOUS : ancienne clé (vérification uniquement, optionnelle)
 * 
 * Procédure de rotation sans downtime :
 * 1. Copier JWT_SECRET actuel dans JWT_SECRET_PREVIOUS
 * 2. Générer un nouveau JWT_SECRET
 * 3. Déployer → les tokens signés avec l'ancienne clé restent valides
 * 4. Après expiration de tous les anciens tokens (1h), supprimer JWT_SECRET_PREVIOUS
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly secrets: string[];

  constructor(config: ConfigService) {
    const primary = config.get<string>('JWT_SECRET');
    const previous = config.get<string>('JWT_SECRET_PREVIOUS');

    // On passe le secret primaire à Passport, mais on override la vérification
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // secretOrKeyProvider essaie chaque clé jusqu'à trouver la bonne
      secretOrKeyProvider: (
        _request: any,
        rawJwtToken: string,
        done: (err: any, secret?: string) => void,
      ) => {
        const keys = [primary];
        if (previous) keys.push(previous);

        for (const key of keys) {
          try {
            jwt.verify(rawJwtToken, key!);
            return done(null, key);
          } catch {
            // Essayer la clé suivante
          }
        }
        return done(new UnauthorizedException('Token invalide.'));
      },
    });

    this.secrets = [primary!];
    if (previous) this.secrets.push(previous);
  }

  async validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
