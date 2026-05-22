import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT') ?? 587;
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.fromAddress = config.get<string>('SMTP_FROM') ?? 'noreply@campusmarche.com';

    if (host && user && pass) {
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email transport configured (${host}:${port})`);
    } else {
      this.transporter = null;
      this.logger.warn('SMTP not configured — emails will be logged to console only');
    }
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    const subject = 'Reset your Campus Marche password';
    const html = `
      <p>Hi,</p>
      <p>We received a request to reset your password. Click the link below to set a new password. The link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="background:#1a3a5c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>— Campus Marche</p>
    `;
    await this.send(to, subject, html);
  }

  async sendOtpEmail(to: string, code: string) {
    const subject = 'Your Campus Marche verification code';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#1e1b4b,#4f46e5,#7c3aed);padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">Campus Marche</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e0e7ff;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#1e1b4b;margin:0 0 16px">Verify your account</h2>
          <p style="color:#475569;margin:0 0 24px">Enter the code below to verify your Campus Marche account. This code expires in 10 minutes.</p>
          <div style="background:#f0f0ff;border:2px dashed #4f46e5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#4f46e5">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0">If you did not create an account, you can safely ignore this email.</p>
        </div>
      </div>
    `;
    await this.send(to, subject, html);
  }

  async sendEmailVerification(to: string, verifyUrl: string) {
    const subject = 'Verify your Campus Marche email';
    const html = `
      <p>Hi,</p>
      <p>Thanks for joining Campus Marche! Please verify your email address by clicking the link below. The link expires in 24 hours.</p>
      <p><a href="${verifyUrl}" style="background:#1a3a5c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p>— Campus Marche</p>
    `;
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Body (first 500 chars): ${html.replace(/<[^>]+>/g, ' ').trim().slice(0, 500)}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${String(err)}`);
    }
  }
}
