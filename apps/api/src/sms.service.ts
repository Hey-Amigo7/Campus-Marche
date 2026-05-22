import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string | undefined;
  private readonly sender: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('ARKESEL_API_KEY');
    this.sender = this.config.get<string>('SMS_SENDER_ID', 'CampusMarche');
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const message = `Your Campus Marche verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

    if (!this.apiKey) {
      this.logger.warn(`[SMS FALLBACK] To ${phone}: ${message}`);
      return;
    }

    try {
      const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: this.sender,
          message,
          recipients: [phone],
        }),
      });

      const result = (await response.json()) as { status: string; message?: string };

      if (result.status !== 'success') {
        throw new Error(result.message ?? 'Arkesel SMS failed');
      }

      this.logger.log(`SMS sent to ${phone}`);
    } catch (err) {
      this.logger.error(`SMS send failed for ${phone}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  normalizeGhanaPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('233') && digits.length === 12) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
    if (digits.length === 9) return `+233${digits}`;
    return `+${digits}`;
  }
}
