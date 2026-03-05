import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async createConversation(userId: string, participantIds: string[], title?: string) {
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    const conversation = await this.prisma.conversation.create({
      data: {
        title,
        participants: {
          create: allParticipantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
      },
    });

    return conversation;
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { content: true, createdAt: true, senderId: true },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return conversations.map((cp) => {
      const unreadMessages = cp.conversation.messages.filter(
        (m) => m.createdAt > (cp.lastReadAt ?? new Date(0)),
      );
      return {
        ...cp.conversation,
        lastReadAt: cp.lastReadAt,
        isMuted: cp.isMuted,
        hasUnread: unreadMessages.length > 0,
      };
    });
  }

  async getMessages(userId: string, conversationId: string, page = 1, limit = 50) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant in this conversation');

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          attachments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
    ]);

    // Mark as read
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return { messages: messages.reverse(), total, page, limit };
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant in this conversation');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        type: 'TEXT',
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Update sender's last read
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return message;
  }

  async deleteMessage(userId: string, messageId: string, isAdmin = false) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');

    if (message.senderId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  async getParticipantUserIds(conversationId: string): Promise<string[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }
}
