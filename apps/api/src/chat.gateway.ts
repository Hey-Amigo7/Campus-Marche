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

  constructor(private jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    try {
      const token = (socket.handshake.auth as Record<string, string>).token
        ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new UnauthorizedException('No token');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      socket.data.userId = payload.sub;
      await socket.join(`user:${payload.sub}`);
      this.logger.log(`Socket connected: ${payload.sub}`);
    } catch {
      this.logger.warn(`Socket auth failed — disconnecting ${socket.id}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    if (socket.data.userId) {
      this.logger.log(`Socket disconnected: ${socket.data.userId as string}`);
    }
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(@ConnectedSocket() socket: Socket, @MessageBody() conversationId: string) {
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
    await socket.join(`order:${orderId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave:order')
  async handleLeaveOrder(@ConnectedSocket() socket: Socket, @MessageBody() orderId: string) {
    await socket.leave(`order:${orderId}`);
    return { ok: true };
  }

  // ── WebRTC Signaling ──────────────────────────────────────────────────────

  @SubscribeMessage('call:offer')
  handleCallOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; conversationId: string; offer: unknown },
  ) {
    this.server.to(`user:${data.to}`).emit('call:offer', {
      from: socket.data.userId as string,
      conversationId: data.conversationId,
      offer: data.offer,
    });
  }

  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; answer: unknown },
  ) {
    this.server.to(`user:${data.to}`).emit('call:answer', {
      from: socket.data.userId as string,
      answer: data.answer,
    });
  }

  @SubscribeMessage('call:ice')
  handleIceCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; candidate: unknown },
  ) {
    this.server.to(`user:${data.to}`).emit('call:ice', {
      from: socket.data.userId as string,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('call:end')
  handleCallEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; conversationId: string },
  ) {
    this.server.to(`user:${data.to}`).emit('call:end', {
      from: socket.data.userId as string,
    });
    this.server.to(`conv:${data.conversationId}`).emit('call:end', {
      from: socket.data.userId as string,
    });
  }

  @SubscribeMessage('call:reject')
  handleCallReject(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string },
  ) {
    this.server.to(`user:${data.to}`).emit('call:reject', {
      from: socket.data.userId as string,
    });
  }

  // ── Called by services ────────────────────────────────────────────────────

  emitNewMessage(conversationId: string, message: unknown, recipientUserId: string) {
    this.server.to(`conv:${conversationId}`).emit('message:new', message);
    this.server.to(`user:${recipientUserId}`).emit('message:new', message);
    this.server.to(`user:${recipientUserId}`).emit('conversations:update', { conversationId });
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
}
