import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly siteUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail = this.config.get<string>('FROM_EMAIL') || 'Silence of Céleste <noreply@silenceofceleste.com>';
    this.siteUrl = this.config.get<string>('PUBLIC_SITE_URL') || 'https://www.silenceofceleste.com';
  }

  async sendVerificationEmail(email: string, token: string, displayName?: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY non configurée — email de vérification non envoyé');
      return;
    }

    const verifyUrl = `${this.siteUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const name = displayName || email.split('@')[0];

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="text-align:center;padding:32px 0 16px;">
          <h1 style="font-size:22px;font-weight:600;margin:0;">Silence of Céleste</h1>
          <p style="color:#888;font-size:13px;margin:4px 0 0;">Vérification de votre email</p>
        </div>
        <div style="background:#f9f9f9;border-radius:12px;padding:24px;margin:16px 0;">
          <p style="margin:0 0 12px;">Bonjour <strong>${name}</strong>,</p>
          <p style="margin:0 0 12px;color:#555;">Merci d'avoir créé votre compte Silence of Céleste. Pour activer votre compte, veuillez confirmer votre adresse email :</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
              Confirmer mon email
            </a>
          </div>
          <p style="margin:0;color:#999;font-size:12px;">Ce lien est valable 24 heures. Si vous n'avez pas créé ce compte, ignorez cet email.</p>
        </div>
        <p style="font-size:11px;color:#bbb;text-align:center;margin-top:32px;">
          Si le bouton ne fonctionne pas, copiez ce lien :<br/>
          <a href="${verifyUrl}" style="color:#888;word-break:break-all;">${verifyUrl}</a>
        </p>
      </div>
    `;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Confirmez votre email — Silence of Céleste',
        html,
      });
    } catch (err) {
      this.logger.error('Erreur envoi email vérification:', err);
    }
  }

  async sendPasswordResetEmail(email: string, token: string, displayName?: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY non configurée — email de reset non envoyé');
      return;
    }

    const resetUrl = `${this.siteUrl}/compte/reset-password?token=${encodeURIComponent(token)}`;
    const name = displayName || email.split('@')[0];

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="text-align:center;padding:32px 0 16px;">
          <h1 style="font-size:22px;font-weight:600;margin:0;">Silence of Céleste</h1>
          <p style="color:#888;font-size:13px;margin:4px 0 0;">Réinitialisation du mot de passe</p>
        </div>
        <div style="background:#f9f9f9;border-radius:12px;padding:24px;margin:16px 0;">
          <p style="margin:0 0 12px;">Bonjour <strong>${name}</strong>,</p>
          <p style="margin:0 0 12px;color:#555;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="margin:0;color:#999;font-size:12px;">Ce lien est valable 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        </div>
        <p style="font-size:11px;color:#bbb;text-align:center;margin-top:32px;">
          Si le bouton ne fonctionne pas, copiez ce lien :<br/>
          <a href="${resetUrl}" style="color:#888;word-break:break-all;">${resetUrl}</a>
        </p>
      </div>
    `;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Réinitialisation de votre mot de passe — Silence of Céleste',
        html,
      });
    } catch (err) {
      this.logger.error('Erreur envoi email reset password:', err);
    }
  }
}
