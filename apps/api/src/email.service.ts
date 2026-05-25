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
      const isGmail = host.toLowerCase().includes('gmail');
      this.transporter = createTransport(
        isGmail
          ? { service: 'gmail', auth: { user, pass } }
          : {
              host,
              port,
              secure: port === 465,
              requireTLS: port !== 465,
              auth: { user, pass },
              tls: { minVersion: 'TLSv1.2' },
            },
      );
      this.logger.log(`Email transport configured (${isGmail ? 'gmail-service' : `${host}:${port}`})`);
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

  async sendContactMessage(senderName: string, senderEmail: string, subject: string, message: string) {
    const safeMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0F172A,#102542,#1a3a2a);padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:20px;font-weight:900">Campus Marche — Contact Message</h2>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:80px">From:</td><td style="padding:6px 0;font-weight:700;color:#0F172A">${senderName} &lt;${senderEmail}&gt;</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Subject:</td><td style="padding:6px 0;font-weight:700;color:#0F172A">${subject}</td></tr>
          </table>
          <div style="background:#f8fafc;border-left:3px solid #7FB685;padding:16px;border-radius:0 8px 8px 0">
            <p style="margin:0;white-space:pre-wrap;color:#334155;line-height:1.7">${safeMsg}</p>
          </div>
          <p style="margin-top:20px;font-size:12px;color:#94a3b8">Received via Campus Marche contact form · Reply to ${senderEmail}</p>
        </div>
      </div>`;
    await this.send(this.fromAddress, `[Contact] ${subject}`, html);
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
