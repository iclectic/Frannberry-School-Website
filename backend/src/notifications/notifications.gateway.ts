import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(client.userId);
      }
    }
  }

  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  sendToMany(userIds: string[], notification: any) {
    for (const userId of userIds) {
      this.sendToUser(userId, notification);
    }
  }
}
