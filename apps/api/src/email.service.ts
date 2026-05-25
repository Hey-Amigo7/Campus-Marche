import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

const BRAND = {
  navy: '#0F172A',
  green: '#7FB685',
  caramel: '#C68B59',
  bg: '#FAF7F2',
  muted: '#64748B',
  border: '#E2E8F0',
};

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Campus Marche</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border}">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.navy} 0%,#102542 55%,#1a3a2a 100%);padding:28px 32px">
            <p style="margin:0;font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.3px">Campus Marche</p>
            <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:${BRAND.green}">Student Marketplace · Ho Technical University</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:${BRAND.bg};padding:20px 32px;border-top:1px solid ${BRAND.border}">
            <p style="margin:0;font-size:12px;color:${BRAND.muted};text-align:center">
              Campus Marche · Ho Technical University, Ghana<br>
              This email was sent from an unmonitored address. Do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function primaryButton(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;background:${BRAND.navy};color:#fff;text-decoration:none;font-weight:900;font-size:14px;padding:13px 28px;border-radius:12px">${text}</a>`;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;
  private readonly contactEmail: string;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT') ?? 587;
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.fromAddress = config.get<string>('SMTP_FROM') ?? 'noreply@campusmarche.com';
    this.contactEmail = config.get<string>('CONTACT_EMAIL') ?? this.fromAddress;

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
      this.logger.log(`Email transport configured (${isGmail ? 'Gmail service' : `${host}:${port}`})`);
    } else {
      this.transporter = null;
      this.logger.warn('SMTP not configured — emails will be logged to console only');
    }
  }

  async sendOtpEmail(to: string, code: string) {
    const html = baseLayout(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:${BRAND.navy}">Verify your account</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Enter this code to complete your Campus Marche verification. It expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:${BRAND.bg};border:2px solid ${BRAND.green};border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
        <span style="font-size:44px;font-weight:900;letter-spacing:14px;color:${BRAND.navy};font-family:monospace">${code}</span>
      </div>
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">
        If you did not create an account on Campus Marche, you can safely ignore this email.
      </p>
    `);
    await this.send(to, 'Your Campus Marche verification code', html);
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    const html = baseLayout(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:${BRAND.navy}">Reset your password</h2>
      <p style="margin:0 0 4px;font-size:15px;color:${BRAND.muted};line-height:1.6">
        We received a request to reset the password for your Campus Marche account.
        Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
      </p>
      ${primaryButton('Reset my password', resetUrl)}
      <p style="margin:28px 0 0;font-size:13px;color:${BRAND.muted}">
        If you did not request a password reset, you can safely ignore this email — your account is secure.
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#94A3B8">
        Or copy this URL into your browser:<br>
        <span style="word-break:break-all;color:${BRAND.muted}">${resetUrl}</span>
      </p>
    `);
    await this.send(to, 'Reset your Campus Marche password', html);
  }

  async sendEmailVerification(to: string, verifyUrl: string) {
    const html = baseLayout(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:${BRAND.navy}">Confirm your email</h2>
      <p style="margin:0 0 4px;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Thanks for joining Campus Marche! Click the button below to verify your email address.
        This link expires in <strong>24 hours</strong>.
      </p>
      ${primaryButton('Verify my email', verifyUrl)}
      <p style="margin:28px 0 0;font-size:13px;color:${BRAND.muted}">
        If you did not create an account, you can safely ignore this email.
      </p>
    `);
    await this.send(to, 'Verify your Campus Marche email', html);
  }

  async sendContactMessage(senderName: string, senderEmail: string, subject: string, message: string) {
    const safeMsg = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const html = baseLayout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:900;color:${BRAND.navy}">New contact message</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:13px;width:70px;font-weight:600">From</td>
          <td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-weight:700;color:${BRAND.navy}">
            ${senderName} &lt;<a href="mailto:${senderEmail}" style="color:${BRAND.green}">${senderEmail}</a>&gt;
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:${BRAND.muted};font-size:13px;font-weight:600">Subject</td>
          <td style="padding:8px 0;font-weight:700;color:${BRAND.navy}">${subject}</td>
        </tr>
      </table>
      <div style="background:${BRAND.bg};border-left:3px solid ${BRAND.green};padding:16px 20px;border-radius:0 10px 10px 0">
        <p style="margin:0;white-space:pre-wrap;color:#334155;line-height:1.7;font-size:14px">${safeMsg}</p>
      </div>
      <p style="margin-top:20px;font-size:12px;color:#94A3B8">
        Received via Campus Marche contact form · Reply directly to
        <a href="mailto:${senderEmail}" style="color:${BRAND.green}">${senderEmail}</a>
      </p>
    `);

    // Send to the configured admin/contact inbox
    await this.send(this.contactEmail, `[Contact] ${subject} — from ${senderName}`, html);
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
      this.logger.log(`Email sent to ${to} — messageId: ${info.messageId}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${String(err)}`);
      throw err;
    }
  }
}
