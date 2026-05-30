import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { ChatGateway } from './chat.gateway';
import type { NotificationService } from './notification.service';
import type { MessageType } from '@prisma/client';

export type SendRichMessageDto = {
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  liveUntil?: Date;
  viewOnce?: boolean;
  duration?: number;
  callStatus?: string;
};

const SENDER_SELECT = { id: true, name: true, avatar: true } as const;

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    @Optional() private chatGateway?: ChatGateway,
    @Optional() private notificationService?: NotificationService,
  ) {}

  async getConversations(userId: string) {
    const [conversations, unreadGroups] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
        include: {
          participantA: { select: { id: true, name: true, avatar: true, verified: true } },
          participantB: { select: { id: true, name: true, avatar: true, verified: true } },
          product: { select: { id: true, title: true, imageUrl: true, price: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.message.groupBy({
        by: ['conversationId'],
        where: {
          senderId: { not: userId },
          read: false,
          conversation: { OR: [{ participantAId: userId }, { participantBId: userId }] },
        },
        _count: { id: true },
      }),
    ]);

    const unreadByConversation = new Map(
      unreadGroups.map((g) => [g.conversationId, g._count.id]),
    );

    return conversations.map((conv) => {
      const other = conv.participantAId === userId ? conv.participantB : conv.participantA;
      const last  = conv.messages[0];
      return {
        id: conv.id,
        user: other,
        product: conv.product,
        lastMessage: last
          ? { content: last.content, type: last.type, createdAt: last.createdAt }
          : null,
        unread: unreadByConversation.get(conv.id) ?? 0,
        updatedAt: conv.updatedAt,
      };
    });
  }

  async getOrCreateConversation(userId: string, recipientId: string, productId?: string) {
    if (userId === recipientId) throw new BadRequestException('Cannot start a conversation with yourself');
    const [aId, bId] = [userId, recipientId].sort();
    const existing = await this.prisma.conversation.findFirst({
      where: { participantAId: aId, participantBId: bId, productId: productId ?? null },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: { participantAId: aId!, participantBId: bId!, productId: productId ?? null },
    });
  }

  async getMessages(conversationId: string, userId: string, opts: { skip?: number; take?: number } = {}) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const take = Math.min(opts.take ?? 50, 100);
    const skip = opts.skip ?? 0;

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: SENDER_SELECT } },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });

    return messages.map((msg) => ({
      ...msg,
      mine: msg.senderId === userId,
    }));
  }

  async sendMessage(conversationId: string, userId: string, content: string) {
    return this.sendRichMessage(conversationId, userId, {
      type: 'TEXT',
      content: content.trim(),
    });
  }

  async sendRichMessage(conversationId: string, userId: string, data: SendRichMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (data.type === 'TEXT') {
      const trimmed = data.content?.trim() ?? '';
      if (!trimmed) throw new BadRequestException('Message content cannot be empty');
      if (trimmed.length > 2000) throw new BadRequestException('Message too long (max 2000 characters)');
      data.content = trimmed;
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: data.type,
          content: data.content ?? null,
          mediaUrl: data.mediaUrl ?? null,
          fileName: data.fileName ?? null,
          fileSize: data.fileSize ?? null,
          mimeType: data.mimeType ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          locationName: data.locationName ?? null,
          liveUntil: data.liveUntil ?? null,
          viewOnce: data.viewOnce ?? false,
          duration: data.duration ?? null,
          callStatus: data.callStatus ?? null,
        },
        include: { sender: { select: SENDER_SELECT } },
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);

    const result = { ...message, mine: true };
    const recipientId = conversation.participantAId === userId
      ? conversation.participantBId
      : conversation.participantAId;

    this.chatGateway?.emitNewMessage(conversationId, { ...result, mine: false }, recipientId);

    if (data.type === 'TEXT') {
      this.notificationService
        ?.notify(recipientId, 'message', 'New message', 'You have a new message')
        .catch(() => undefined);
    }

    return result;
  }

  async markConversationRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  async markMessageViewed(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!message) throw new NotFoundException('Message not found');

    const { conversation } = message;
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (!message.viewOnce) return { ok: true };
    if (message.viewedBy.includes(userId)) return { ok: true, alreadyViewed: true };

    await this.prisma.message.update({
      where: { id: messageId },
      data: { viewedBy: { push: userId } },
    });

    // Notify conversation room that message was viewed
    this.chatGateway?.emitViewOnce(message.conversationId, messageId, userId);

    return { ok: true };
  }

  async updateLiveLocation(conversationId: string, userId: string, lat: number, lng: number) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    this.chatGateway?.emitLocationUpdate(conversationId, userId, lat, lng);
    return { ok: true };
  }
}
