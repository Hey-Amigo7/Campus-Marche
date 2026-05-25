import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async submit(data: { name: string; email: string; subject: string; message: string }) {
    const record = await this.prisma.contactMessage.create({ data });

    this.logger.log(`Contact message from ${data.email} — "${data.subject}"`);

    await this.emailService
      .sendContactMessage(data.name, data.email, data.subject, data.message)
      .catch((err) => this.logger.error(`Forward contact email failed: ${String(err)}`));

    return { id: record.id, message: 'Thank you! Your message has been received. We will get back to you within 24 hours.' };
  }

  async listAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: string, _adminId: string) {
    return this.prisma.contactMessage.update({
      where: { id },
      data: { status: 'resolved' },
    });
  }
}
