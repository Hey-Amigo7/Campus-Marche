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
  async handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() conversationId: string,
  ) {
    await socket.join(`conv:${conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave:conversation')
  async handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() conversationId: string,
  ) {
    await socket.leave(`conv:${conversationId}`);
    return { ok: true };
  }

  /** Called by MessageService after a message is persisted */
  emitNewMessage(conversationId: string, message: unknown, recipientUserId: string) {
    // Emit to conversation room (recipient is inside the chat view)
    this.server.to(`conv:${conversationId}`).emit('message:new', message);
    // Also emit to recipient's personal room in case they haven't joined the conv room yet
    this.server.to(`user:${recipientUserId}`).emit('message:new', message);
    this.server.to(`user:${recipientUserId}`).emit('conversations:update', { conversationId });
  }

  /** Called by NotificationService after a notification is created */
  emitNotification(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }
}
