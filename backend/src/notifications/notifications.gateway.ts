import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: AuthenticatedSocket) {
    const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
    if (!userId) {
      client.disconnect();
      return;
    }
    client.userId = userId as string;
    if (!this.userSockets.has(client.userId)) {
      this.userSockets.set(client.userId, new Set());
    }
    this.userSockets.get(client.userId)!.add(client.id);
    client.join(`user:${client.userId}`);

    // Broadcast online status
    this.server.emit('userOnline', { userId: client.userId });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
          this.server.emit('userOffline', { userId: client.userId });
        }
      }
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  sendToMany(userIds: string[], notification: any) {
    for (const userId of userIds) {
      this.sendToUser(userId, notification);
    }
  }

  // ── Real-time Messaging ───────────────────────────────────────────────────

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.to(`conversation:${data.conversationId}`).emit('typing', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.to(`conversation:${data.conversationId}`).emit('stopTyping', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }

  sendMessageToConversation(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('newMessage', message);
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
