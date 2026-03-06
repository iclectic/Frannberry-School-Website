import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        body: data.body,
        link: data.link,
      },
    });

    // Push via WebSocket
    this.gateway.sendToUser(data.userId, notification);

    return notification;
  }

  async createBulk(userIds: string[], data: {
    type: string;
    title: string;
    body: string;
    link?: string;
  }) {
    const notifications = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: data.type as any,
        title: data.title,
        body: data.body,
        link: data.link,
      })),
    });

    // Push to each user via WebSocket
    for (const userId of userIds) {
      this.gateway.sendToUser(userId, { ...data, userId });
    }

    return notifications;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
