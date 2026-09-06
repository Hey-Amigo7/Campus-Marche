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
  replyToId?: string;
};

const SENDER_SELECT = { id: true, name: true, avatar: true } as const;

const REACTION_SELECT = {
  id: true,
  emoji: true,
  userId: true,
  user: { select: { id: true, name: true } },
} as const;

const REPLY_SELECT = {
  id: true,
  content: true,
  type: true,
  mediaUrl: true,
  deletedAt: true,
  sender: { select: SENDER_SELECT },
} as const;

const MSG_INCLUDE = {
  sender:    { select: SENDER_SELECT },
  reactions: { select: REACTION_SELECT },
  replyTo:   { select: REPLY_SELECT },
} as const;

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    @Optional() private chatGateway?: ChatGateway,
    @Optional() private notificationService?: NotificationService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async assertParticipant(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.participantAId !== userId && conv.participantBId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return conv;
  }

  private shapeMessage(msg: Record<string, unknown>, userId: string) {
    return { ...msg, mine: msg['senderId'] === userId };
  }

  // ── Conversations ──────────────────────────────────────────────────────────

  async getConversations(userId: string) {
    const [conversations, unreadGroups, prefs] = await Promise.all([
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
          deletedAt: null,
          conversation: { OR: [{ participantAId: userId }, { participantBId: userId }] },
        },
        _count: { id: true },
      }),
      this.prisma.conversationPreference.findMany({ where: { userId } }),
    ]);

    const unreadMap = new Map(unreadGroups.map((g) => [g.conversationId, g._count.id]));
    const prefsMap  = new Map(prefs.map((p) => [p.conversationId, p]));

    const mapped = conversations.map((conv) => {
      const other = conv.participantAId === userId ? conv.participantB : conv.participantA;
      const last  = conv.messages[0];
      const pref  = prefsMap.get(conv.id);
      return {
        id: conv.id,
        user: other,
        product: conv.product,
        lastMessage: last
          ? { content: last.content, type: last.type, createdAt: last.createdAt }
          : null,
        unread:   unreadMap.get(conv.id) ?? 0,
        updatedAt: conv.updatedAt,
        muted:    pref?.muted    ?? false,
        pinned:   pref?.pinned   ?? false,
        archived: pref?.archived ?? false,
      };
    });

    // Pinned first, then by updatedAt
    return mapped.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(
    conversationId: string,
    userId: string,
    opts: { skip?: number; take?: number; before?: string } = {},
  ) {
    await this.assertParticipant(conversationId, userId);

    const take = Math.min(opts.take ?? 50, 100);

    let where: Record<string, unknown> = { conversationId };

    if (opts.before) {
      // Cursor-based: fetch messages older than `before` (ISO datetime)
      where = { ...where, createdAt: { lt: new Date(opts.before) } };
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: MSG_INCLUDE,
      orderBy: { createdAt: 'asc' },
      skip:  opts.before ? 0 : (opts.skip ?? 0),
      take,
    });

    return messages.map((msg) => this.shapeMessage(msg as unknown as Record<string, unknown>, userId));
  }

  async searchMessages(conversationId: string, userId: string, q: string) {
    await this.assertParticipant(conversationId, userId);
    if (!q || q.trim().length < 2) return [];

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        type: 'TEXT',
        deletedAt: null,
        content: { contains: q.trim(), mode: 'insensitive' },
      },
      include: MSG_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return messages.map((msg) => this.shapeMessage(msg as unknown as Record<string, unknown>, userId));
  }

  async sendMessage(conversationId: string, userId: string, content: string, replyToId?: string) {
    return this.sendRichMessage(conversationId, userId, {
      type: 'TEXT',
      content: content.trim(),
      replyToId,
    });
  }

  async sendRichMessage(conversationId: string, userId: string, data: SendRichMessageDto) {
    const conversation = await this.assertParticipant(conversationId, userId);

    if (data.type === 'TEXT') {
      const trimmed = data.content?.trim() ?? '';
      if (!trimmed) throw new BadRequestException('Message content cannot be empty');
      if (trimmed.length > 2000) throw new BadRequestException('Message too long (max 2000 characters)');
      data.content = trimmed;
    }

    // Validate replyToId belongs to same conversation
    if (data.replyToId) {
      const replyMsg = await this.prisma.message.findUnique({ where: { id: data.replyToId } });
      if (!replyMsg || replyMsg.conversationId !== conversationId) {
        data.replyToId = undefined;
      }
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId:     userId,
          type:         data.type,
          content:      data.content    ?? null,
          mediaUrl:     data.mediaUrl   ?? null,
          fileName:     data.fileName   ?? null,
          fileSize:     data.fileSize   ?? null,
          mimeType:     data.mimeType   ?? null,
          latitude:     data.latitude   ?? null,
          longitude:    data.longitude  ?? null,
          locationName: data.locationName ?? null,
          liveUntil:    data.liveUntil  ?? null,
          viewOnce:     data.viewOnce   ?? false,
          duration:     data.duration   ?? null,
          callStatus:   data.callStatus ?? null,
          replyToId:    data.replyToId  ?? null,
        },
        include: MSG_INCLUDE,
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);

    const recipientId = conversation.participantAId === userId
      ? conversation.participantBId
      : conversation.participantAId;

    const result = this.shapeMessage(message as unknown as Record<string, unknown>, userId);
    this.chatGateway?.emitNewMessage(conversationId, { ...result, mine: false }, recipientId);

    if (data.type === 'TEXT') {
      this.notificationService
        ?.notify(recipientId, 'message', 'New message', 'You have a new message')
        .catch(() => undefined);
    }

    return result;
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('Cannot edit someone else\'s message');
    if (msg.type !== 'TEXT') throw new BadRequestException('Only text messages can be edited');
    if (msg.deletedAt) throw new BadRequestException('Message is deleted');

    const trimmed = content.trim();
    if (!trimmed) throw new BadRequestException('Content cannot be empty');
    if (trimmed.length > 2000) throw new BadRequestException('Message too long');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data:  { content: trimmed, editedAt: new Date() },
      include: MSG_INCLUDE,
    });

    const shaped = this.shapeMessage(updated as unknown as Record<string, unknown>, userId);
    this.chatGateway?.emitMessageEdited(msg.conversationId, shaped);
    return shaped;
  }

  async deleteMessage(messageId: string, userId: string, mode: 'me' | 'everyone') {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!msg) throw new NotFoundException('Message not found');

    const { conversation } = msg;
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (mode === 'everyone') {
      if (msg.senderId !== userId) throw new ForbiddenException('Can only delete your own messages for everyone');
      await this.prisma.message.update({
        where: { id: messageId },
        data:  { deletedAt: new Date(), content: null, mediaUrl: null },
      });
      this.chatGateway?.emitMessageDeleted(conversation.id, messageId, 'everyone');
    } else {
      // Delete for me: add userId to deletedFor array
      if (!msg.deletedFor.includes(userId)) {
        await this.prisma.message.update({
          where: { id: messageId },
          data:  { deletedFor: { push: userId } },
        });
      }
    }

    return { ok: true };
  }

  // ── Reactions ──────────────────────────────────────────────────────────────

  async reactToMessage(messageId: string, userId: string, emoji: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    await this.assertParticipant(msg.conversationId, userId);
    if (msg.deletedAt) throw new BadRequestException('Cannot react to deleted message');

    // Validate emoji is a single grapheme cluster (basic guard)
    if ([...emoji].length > 4 || emoji.length > 8) throw new BadRequestException('Invalid emoji');

    const reaction = await this.prisma.messageReaction.upsert({
      where:  { messageId_userId: { messageId, userId } },
      create: { messageId, userId, emoji },
      update: { emoji },
    });

    const reactions = await this.prisma.messageReaction.findMany({
      where:  { messageId },
      select: REACTION_SELECT,
    });

    this.chatGateway?.emitMessageReaction(msg.conversationId, messageId, reactions);
    return reaction;
  }

  async removeReaction(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    await this.assertParticipant(msg.conversationId, userId);

    await this.prisma.messageReaction.deleteMany({ where: { messageId, userId } });

    const reactions = await this.prisma.messageReaction.findMany({
      where:  { messageId },
      select: REACTION_SELECT,
    });

    this.chatGateway?.emitMessageReaction(msg.conversationId, messageId, reactions);
    return { ok: true };
  }

  // ── Forward ────────────────────────────────────────────────────────────────

  async forwardMessage(messageId: string, userId: string, targetConversationId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    await this.assertParticipant(msg.conversationId, userId);
    await this.assertParticipant(targetConversationId, userId);

    if (msg.deletedAt) throw new BadRequestException('Cannot forward deleted message');

    return this.sendRichMessage(targetConversationId, userId, {
      type:        msg.type,
      content:     msg.content ?? undefined,
      mediaUrl:    msg.mediaUrl ?? undefined,
      fileName:    msg.fileName ?? undefined,
      fileSize:    msg.fileSize ?? undefined,
      mimeType:    msg.mimeType ?? undefined,
      latitude:    msg.latitude ?? undefined,
      longitude:   msg.longitude ?? undefined,
      locationName: msg.locationName ?? undefined,
      duration:    msg.duration ?? undefined,
    });
  }

  // ── Read / View ────────────────────────────────────────────────────────────

  async markConversationRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, read: false },
      data:  { read: true },
    });
    return { ok: true };
  }

  async markMessageViewed(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where:   { id: messageId },
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
      data:  { viewedBy: { push: userId } },
    });

    this.chatGateway?.emitViewOnce(message.conversationId, messageId, userId);
    return { ok: true };
  }

  // ── Live location ──────────────────────────────────────────────────────────

  async updateLiveLocation(conversationId: string, userId: string, lat: number, lng: number) {
    await this.assertParticipant(conversationId, userId);
    this.chatGateway?.emitLocationUpdate(conversationId, userId, lat, lng);
    return { ok: true };
  }

  // ── Conversation preferences ───────────────────────────────────────────────

  async setConvPreference(
    userId: string,
    conversationId: string,
    prefs: { muted?: boolean; pinned?: boolean; archived?: boolean },
  ) {
    await this.assertParticipant(conversationId, userId);
    return this.prisma.conversationPreference.upsert({
      where:  { userId_conversationId: { userId, conversationId } },
      create: { userId, conversationId, ...prefs },
      update: prefs,
    });
  }
}
