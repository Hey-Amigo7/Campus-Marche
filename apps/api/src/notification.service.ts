import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { ChatGateway } from './chat.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    @Optional() private chatGateway?: ChatGateway,
  ) {}

  async getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) return null;
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async create(data: { userId: string; type: string; title: string; body: string }) {
    const notification = await this.prisma.notification.create({ data });
    this.chatGateway?.emitNotification(data.userId, notification);
    return notification;
  }

  async notify(userId: string, type: string, title: string, body: string) {
    return this.create({ userId, type, title, body });
  }
}
