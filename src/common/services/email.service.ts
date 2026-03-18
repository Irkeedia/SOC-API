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

  // ============================================================
  // TEMPLATE DE BASE
  // ============================================================

  private emailLayout(title: string, content: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f1021;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1021;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="text-align:center;padding:0 0 32px;">
          <h1 style="margin:0;font-size:26px;font-weight:700;letter-spacing:2px;color:#ffffff;">SILENCE OF CÉLESTE</h1>
          <div style="width:60px;height:2px;background:linear-gradient(90deg,#7c3aed,#ec4899);margin:12px auto 0;border-radius:2px;"></div>
          <p style="margin:8px 0 0;font-size:13px;color:#aab0c0;letter-spacing:0.5px;">${title}</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 28px;">
          ${content}
        </td></tr>
        <tr><td style="text-align:center;padding:32px 0 0;">
          <p style="margin:0 0 8px;font-size:11px;color:#555a70;">© ${new Date().getFullYear()} Silence of Céleste — Tous droits réservés</p>
          <p style="margin:0;font-size:11px;color:#555a70;">
            <a href="${this.siteUrl}" style="color:#7c3aed;text-decoration:none;">silenceofceleste.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private btnPrimary(href: string, label: string): string {
    return `<div style="text-align:center;margin:28px 0;">
      <a href="${href}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;letter-spacing:0.3px;">
        ${label}
      </a>
    </div>`;
  }

  private linkFallback(url: string): string {
    return `<p style="font-size:11px;color:#555a70;text-align:center;margin-top:16px;">
      Si le bouton ne fonctionne pas, copiez ce lien :<br/>
      <a href="${url}" style="color:#7c3aed;word-break:break-all;font-size:11px;">${url}</a>
    </p>`;
  }

  // ============================================================
  // 1. VÉRIFICATION EMAIL
  // ============================================================

  async sendVerificationEmail(email: string, token: string, displayName?: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY non configurée — email de vérification non envoyé');
      return;
    }

    const verifyUrl = `${this.siteUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const name = displayName || email.split('@')[0];

    const content = `
      <p style="margin:0 0 16px;color:#ffffff;font-size:15px;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 8px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Merci d'avoir créé votre compte Silence of Céleste.
      </p>
      <p style="margin:0 0 8px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Pour activer votre compte, confirmez votre adresse email :
      </p>
      ${this.btnPrimary(verifyUrl, '✦ Confirmer mon email')}
      <p style="margin:0;color:#555a70;font-size:12px;text-align:center;">Ce lien est valable 24 heures.</p>
      ${this.linkFallback(verifyUrl)}
    `;

    const html = this.emailLayout('Vérification de votre email', content);

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

  // ============================================================
  // 2. RÉINITIALISATION MOT DE PASSE
  // ============================================================

  async sendPasswordResetEmail(email: string, token: string, displayName?: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY non configurée — email de reset non envoyé');
      return;
    }

    const resetUrl = `${this.siteUrl}/compte/reset-password?token=${encodeURIComponent(token)}`;
    const name = displayName || email.split('@')[0];

    const content = `
      <p style="margin:0 0 16px;color:#ffffff;font-size:15px;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 8px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Vous avez demandé la réinitialisation de votre mot de passe.
      </p>
      <p style="margin:0 0 8px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
      </p>
      ${this.btnPrimary(resetUrl, '✦ Réinitialiser mon mot de passe')}
      <p style="margin:0;color:#555a70;font-size:12px;text-align:center;">Ce lien est valable 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      ${this.linkFallback(resetUrl)}
    `;

    const html = this.emailLayout('Réinitialisation du mot de passe', content);

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

  // ============================================================
  // 3. BIENVENUE (après vérification email réussie)
  // ============================================================

  async sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
    if (!this.resend) return;

    const name = displayName || email.split('@')[0];

    const content = `
      <p style="margin:0 0 16px;color:#ffffff;font-size:15px;">Bienvenue <strong>${name}</strong> ✦</p>
      <p style="margin:0 0 12px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Votre email a été vérifié avec succès. Votre compte Silence of Céleste est maintenant actif.
      </p>
      <p style="margin:0 0 20px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Vous pouvez dès maintenant explorer toutes les fonctionnalités :
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#9f7aea;font-size:16px;margin-right:10px;">◈</span>
          <span style="color:#ffffff;font-size:14px;">Enregistrez vos dolls et suivez leur entretien</span>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#ec4899;font-size:16px;margin-right:10px;">◈</span>
          <span style="color:#ffffff;font-size:14px;">Discutez avec Céleste, votre assistante IA</span>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#9f7aea;font-size:16px;margin-right:10px;">◈</span>
          <span style="color:#ffffff;font-size:14px;">Découvrez la boutique et les accessoires</span>
        </td></tr>
        <tr><td style="padding:12px 0;">
          <span style="color:#ec4899;font-size:16px;margin-right:10px;">◈</span>
          <span style="color:#ffffff;font-size:14px;">Rejoignez la communauté</span>
        </td></tr>
      </table>

      ${this.btnPrimary(this.siteUrl, '✦ Accéder à mon compte')}
    `;

    const html = this.emailLayout('Bienvenue chez Silence of Céleste', content);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Bienvenue chez Silence of Céleste ✦',
        html,
      });
    } catch (err) {
      this.logger.error('Erreur envoi email bienvenue:', err);
    }
  }

  // ============================================================
  // 4. CHANGEMENT DE MOT DE PASSE CONFIRMÉ
  // ============================================================

  async sendPasswordChangedEmail(email: string, displayName?: string): Promise<void> {
    if (!this.resend) return;

    const name = displayName || email.split('@')[0];

    const content = `
      <p style="margin:0 0 16px;color:#ffffff;font-size:15px;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 12px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Votre mot de passe a été modifié avec succès.
      </p>
      <p style="margin:0 0 12px;color:#aab0c0;font-size:14px;line-height:1.6;">
        Toutes vos sessions actives ont été déconnectées par sécurité. Vous pouvez vous reconnecter avec votre nouveau mot de passe.
      </p>

      <div style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.15);border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#ec4899;font-size:13px;">
          ⚠ Si vous n'êtes pas à l'origine de ce changement, contactez-nous immédiatement en répondant à cet email.
        </p>
      </div>
    `;

    const html = this.emailLayout('Mot de passe modifié', content);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Mot de passe modifié — Silence of Céleste',
        html,
      });
    } catch (err) {
      this.logger.error('Erreur envoi email changement mdp:', err);
    }
  }
}
