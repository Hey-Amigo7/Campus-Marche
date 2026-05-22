import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    const [conversations, unreadGroups] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
        include: {
          participantA: { select: { id: true, name: true, avatar: true, verified: true } },
          participantB: { select: { id: true, name: true, avatar: true, verified: true } },
          product: { select: { id: true, title: true, imageUrl: true, price: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
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
      const lastMessage = conv.messages[0];

      return {
        id: conv.id,
        user: other,
        product: conv.product,
        lastMessage: lastMessage
          ? { content: lastMessage.content, createdAt: lastMessage.createdAt }
          : null,
        unread: unreadByConversation.get(conv.id) ?? 0,
        updatedAt: conv.updatedAt,
      };
    });
  }

  async getOrCreateConversation(userId: string, recipientId: string, productId?: string) {
    if (userId === recipientId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    const [aId, bId] = [userId, recipientId].sort();

    const existing = await this.prisma.conversation.findFirst({
      where: {
        participantAId: aId,
        participantBId: bId,
        productId: productId ?? null,
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        participantAId: aId!,
        participantBId: bId!,
        productId: productId ?? null,
      },
    });
  }

  async getMessages(conversationId: string, userId: string, opts: { skip?: number; take?: number } = {}) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });

    if (!conversation) throw new NotFoundException('Conversation not found');

    const isParticipant = conversation.participantAId === userId || conversation.participantBId === userId;
    if (!isParticipant) throw new ForbiddenException('Access denied');

    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, read: false },
      data: { read: true },
    });

    const take = Math.min(opts.take ?? 50, 100);
    const skip = opts.skip ?? 0;

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
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
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });

    if (!conversation) throw new NotFoundException('Conversation not found');

    const isParticipant = conversation.participantAId === userId || conversation.participantBId === userId;
    if (!isParticipant) throw new ForbiddenException('Access denied');

    const trimmedContent = content.trim();
    if (!trimmedContent) throw new BadRequestException('Message content cannot be empty');
    if (trimmedContent.length > 2000) throw new BadRequestException('Message too long (max 2000 characters)');

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId: userId, content: trimmedContent },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return { ...message, mine: true };
  }
}
