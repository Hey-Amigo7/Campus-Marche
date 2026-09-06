import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from './prisma.service';

type JwtPayload = { sub: string; email: string };

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // In-memory presence: userId → number of open sockets
  private onlineUsers = new Map<string, number>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = (socket.handshake.auth as Record<string, string>).token
        ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new UnauthorizedException('No token');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      socket.data.userId = payload.sub;
      await socket.join(`user:${payload.sub}`);

      // Presence: track connection count, emit online if first socket
      const prev = this.onlineUsers.get(payload.sub) ?? 0;
      this.onlineUsers.set(payload.sub, prev + 1);
      if (prev === 0) {
        this.server.emit('presence:online', { userId: payload.sub });
      }

      this.logger.log(`Socket connected: ${payload.sub}`);
    } catch {
      this.logger.warn(`Socket auth failed — disconnecting ${socket.id}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      const count = (this.onlineUsers.get(userId) ?? 1) - 1;
      if (count <= 0) {
        this.onlineUsers.delete(userId);
        this.server.emit('presence:offline', { userId });
      } else {
        this.onlineUsers.set(userId, count);
      }
      this.logger.log(`Socket disconnected: ${userId}`);
    }
  }

  // ── Room management ───────────────────────────────────────────────────────

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(@ConnectedSocket() socket: Socket, @MessageBody() conversationId: string) {
    const userId = socket.data.userId as string | undefined;
    if (!userId || !conversationId) return { ok: false, error: 'Unauthorized' };

    const conv = await this.prisma.conversation.findUnique({
      where:  { id: conversationId },
      select: { participantAId: true, participantBId: true },
    });

    if (!conv || (conv.participantAId !== userId && conv.participantBId !== userId)) {
      return { ok: false, error: 'Forbidden' };
    }

    await socket.join(`conv:${conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave:conversation')
  async handleLeaveConversation(@ConnectedSocket() socket: Socket, @MessageBody() conversationId: string) {
    await socket.leave(`conv:${conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('join:order')
  async handleJoinOrder(@ConnectedSocket() socket: Socket, @MessageBody() orderId: string) {
    const userId = socket.data.userId as string | undefined;
    if (!userId || !orderId) return { ok: false, error: 'Unauthorized' };

    const order = await this.prisma.order.findUnique({
      where:  { id: orderId },
      select: { buyerId: true, sellerId: true, deliveryPersonId: true, product: { select: { sellerId: true } } },
    });

    const isAllowed = Boolean(
      order &&
        (order.buyerId === userId ||
          order.sellerId === userId ||
          order.product?.sellerId === userId ||
          order.deliveryPersonId === userId),
    );

    if (!isAllowed) return { ok: false, error: 'Forbidden' };

    await socket.join(`order:${orderId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave:order')
  async handleLeaveOrder(@ConnectedSocket() socket: Socket, @MessageBody() orderId: string) {
    await socket.leave(`order:${orderId}`);
    return { ok: true };
  }

  // ── Typing indicators ─────────────────────────────────────────────────────

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.userId as string | undefined;
    if (!userId || !data?.conversationId) return;
    socket.to(`conv:${data.conversationId}`).emit('typing:start', { userId });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.userId as string | undefined;
    if (!userId || !data?.conversationId) return;
    socket.to(`conv:${data.conversationId}`).emit('typing:stop', { userId });
  }

  // ── Presence query ────────────────────────────────────────────────────────

  @SubscribeMessage('presence:query')
  handlePresenceQuery(
    @ConnectedSocket() _socket: Socket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const online = (data?.userIds ?? []).filter((id) => this.onlineUsers.has(id));
    return { online };
  }

  // ── WebRTC Signaling ──────────────────────────────────────────────────────

  @SubscribeMessage('call:offer')
  handleCallOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; conversationId: string; offer: unknown },
  ) {
    this.server.to(`user:${data.to}`).emit('call:offer', {
      from:           socket.data.userId as string,
      conversationId: data.conversationId,
      offer:          data.offer,
    });
  }

  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; answer: unknown },
  ) {
    this.server.to(`user:${data.to}`).emit('call:answer', {
      from:   socket.data.userId as string,
      answer: data.answer,
    });
  }

  @SubscribeMessage('call:ice')
  handleIceCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; candidate: unknown },
  ) {
    this.server.to(`user:${data.to}`).emit('call:ice', {
      from:      socket.data.userId as string,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('call:end')
  handleCallEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; conversationId: string },
  ) {
    this.server.to(`user:${data.to}`).emit('call:end', { from: socket.data.userId as string });
    this.server.to(`conv:${data.conversationId}`).emit('call:end', { from: socket.data.userId as string });
  }

  @SubscribeMessage('call:reject')
  handleCallReject(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string },
  ) {
    this.server.to(`user:${data.to}`).emit('call:reject', { from: socket.data.userId as string });
  }

  // ── Called by services ────────────────────────────────────────────────────

  emitNewMessage(conversationId: string, message: unknown, recipientUserId: string) {
    this.server.to(`conv:${conversationId}`).emit('message:new', message);
    this.server.to(`user:${recipientUserId}`).emit('message:new', message);
    this.server.to(`user:${recipientUserId}`).emit('conversations:update', { conversationId });
  }

  emitMessageEdited(conversationId: string, message: unknown) {
    this.server.to(`conv:${conversationId}`).emit('message:edited', message);
  }

  emitMessageDeleted(conversationId: string, messageId: string, mode: 'everyone' | 'me') {
    this.server.to(`conv:${conversationId}`).emit('message:deleted', { messageId, mode });
  }

  emitMessageReaction(conversationId: string, messageId: string, reactions: unknown) {
    this.server.to(`conv:${conversationId}`).emit('message:reaction', { messageId, reactions });
  }

  emitNotification(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitViewOnce(conversationId: string, messageId: string, viewedByUserId: string) {
    this.server.to(`conv:${conversationId}`).emit('message:viewed', { messageId, viewedByUserId });
  }

  emitLocationUpdate(conversationId: string, userId: string, lat: number, lng: number) {
    this.server.to(`conv:${conversationId}`).emit('location:update', { userId, lat, lng });
  }

  emitDeliveryLocation(orderId: string, lat: number, lng: number, heading?: number | null, speed?: number | null) {
    this.server.to(`order:${orderId}`).emit('delivery:location', { lat, lng, heading, speed, updatedAt: new Date().toISOString() });
  }

  emitBuyerLocation(orderId: string, lat: number, lng: number) {
    this.server.to(`order:${orderId}`).emit('buyer:location', { lat, lng, updatedAt: new Date().toISOString() });
  }

  emitOrderUpdated(orderId: string, payload: { escrowStatus: string; paymentStatus: string }) {
    this.server.to(`order:${orderId}`).emit('order:updated', payload);
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
