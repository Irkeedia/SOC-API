import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum SecurityEvent {
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  REFRESH_TOKEN_REUSE = 'REFRESH_TOKEN_REUSE',       // Vol potentiel
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  ADMIN_ACTION = 'ADMIN_ACTION',
  SUSPICIOUS_INPUT = 'SUSPICIOUS_INPUT',
}

export interface SecurityLogEntry {
  event: SecurityEvent;
  ip?: string;
  userId?: string;
  email?: string;
  details?: string;
  userAgent?: string;
}

@Injectable()
export class SecurityLoggerService implements OnModuleDestroy {
  private readonly logger = new Logger('SECURITY');
  private readonly alertWebhookUrl: string | undefined;
  private readonly sentryDsn: string | undefined;
  private cleanupTimer: ReturnType<typeof setInterval>;

  // Compteurs en mémoire pour détecter les patterns d'attaque
  private readonly eventCounts = new Map<string, { count: number; firstAt: number }>();
  private readonly ALERT_THRESHOLD = 50;           // 50 events du même type...
  private readonly ALERT_WINDOW_MS = 5 * 60 * 1000; // ...en 5 minutes

  constructor(private readonly config: ConfigService) {
    this.alertWebhookUrl = config.get<string>('SECURITY_WEBHOOK_URL');
    this.sentryDsn = config.get<string>('SENTRY_DSN');

    // Nettoyage périodique des compteurs
    this.cleanupTimer = setInterval(() => this.cleanupCounters(), 10 * 60 * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  /**
   * Log un événement de sécurité. Les événements critiques déclenchent une alerte.
   */
  log(entry: SecurityLogEntry) {
    const sanitized = this.sanitize(entry);
    const line = this.formatLogLine(sanitized);

    // Classifier le niveau de log
    switch (entry.event) {
      case SecurityEvent.REFRESH_TOKEN_REUSE:
      case SecurityEvent.ACCOUNT_LOCKED:
      case SecurityEvent.INVALID_SIGNATURE:
        this.logger.error(line);
        this.incrementAndCheckAlert(entry.event, sanitized);
        break;

      case SecurityEvent.LOGIN_FAILED:
      case SecurityEvent.RATE_LIMIT_HIT:
      case SecurityEvent.FORBIDDEN_ACCESS:
      case SecurityEvent.SUSPICIOUS_INPUT:
        this.logger.warn(line);
        this.incrementAndCheckAlert(entry.event, sanitized);
        break;

      case SecurityEvent.LOGIN_SUCCESS:
      case SecurityEvent.ADMIN_ACTION:
      case SecurityEvent.REFRESH_TOKEN_EXPIRED:
        this.logger.log(line);
        break;
    }
  }

  private formatLogLine(entry: SecurityLogEntry): string {
    const parts = [`[${entry.event}]`];
    if (entry.ip) parts.push(`ip=${entry.ip}`);
    if (entry.email) parts.push(`email=${this.maskEmail(entry.email)}`);
    if (entry.userId) parts.push(`uid=${entry.userId.substring(0, 8)}…`);
    if (entry.details) parts.push(entry.details);
    return parts.join(' ');
  }

  /**
   * Masque l'email dans les logs (m***@example.com)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local[0]}***@${domain}`;
  }

  /**
   * Supprime les données sensibles (tokens, mots de passe) des détails.
   */
  private sanitize(entry: SecurityLogEntry): SecurityLogEntry {
    const clean = { ...entry };
    if (clean.details) {
      // Supprimer tout ce qui ressemble à un token ou mot de passe
      clean.details = clean.details
        .replace(/Bearer\s+[A-Za-z0-9\-_.]+/g, 'Bearer [REDACTED]')
        .replace(/password['":\s]+[^\s,}]+/gi, 'password:[REDACTED]')
        .replace(/token['":\s]+[A-Za-z0-9\-_.]+/gi, 'token:[REDACTED]');
    }
    return clean;
  }

  /**
   * Compteur de patterns : détecte un burst d'événements suspects.
   */
  private incrementAndCheckAlert(event: SecurityEvent, entry: SecurityLogEntry) {
    const now = Date.now();
    const key = event;
    const counter = this.eventCounts.get(key);

    if (!counter || now - counter.firstAt > this.ALERT_WINDOW_MS) {
      this.eventCounts.set(key, { count: 1, firstAt: now });
      return;
    }

    counter.count++;

    if (counter.count === this.ALERT_THRESHOLD) {
      const message = `🚨 ALERTE SÉCURITÉ: ${counter.count}x ${event} en ${Math.round(this.ALERT_WINDOW_MS / 60000)} min. Dernier: ip=${entry.ip || 'N/A'}`;
      this.logger.error(message);
      this.sendAlert(message);
    }
  }

  /**
   * Envoie une alerte via webhook (Discord/Slack/custom).
   */
  private async sendAlert(message: string) {
    if (!this.alertWebhookUrl) return;

    try {
      await fetch(this.alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      this.logger.error('Échec envoi alerte webhook');
    }
  }

  private cleanupCounters() {
    const now = Date.now();
    for (const [key, val] of this.eventCounts) {
      if (now - val.firstAt > this.ALERT_WINDOW_MS * 2) {
        this.eventCounts.delete(key);
      }
    }
  }
}
