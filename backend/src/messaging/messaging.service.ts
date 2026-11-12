import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationPurpose, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { allowanceForSend, londonWeekBounds, LondonWeek } from './allowance';
import { contactsFor, GraphChild, GraphUser, resolveThread, RoleName } from './contact-graph';
import { unreadCount } from './unread';

const participantSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  avatarUrl: true,
} as const;

const conversationInclude = {
  school: { select: { id: true, name: true, phase: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
  participants: { include: { user: { select: participantSelect } } },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: { content: true, createdAt: true, senderId: true },
  },
};

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async getContacts(userId: string) {
    const { users, children, schools } = await this.loadDirectory();
    const schoolById = new Map(schools.map((school) => [school.id, school]));
    const contacts = contactsFor(userId, users, children).map((contact) => ({
      userId: contact.userId,
      role: contact.role,
      name: contact.name,
      purpose: contact.purpose,
      requiresStudentId: contact.requiresStudentId,
      schools: contact.schoolIds.map((id) => {
        const school = schoolById.get(id);
        return { id, name: school?.name ?? id, phase: school?.phase ?? null };
      }),
      children: contact.children.map((child) => ({
        studentId: child.studentId,
        name: child.name,
        schoolId: child.schoolId,
        schoolName: schoolById.get(child.schoolId)?.name ?? null,
      })),
    }));
    return { contacts };
  }

  async createConversation(userId: string, participantId: string, studentId?: string) {
    const { users, children } = await this.loadDirectory();
    const resolved = resolveThread(userId, participantId, studentId, users, children);
    if (!resolved.ok) {
      if (resolved.status === 400) throw new BadRequestException(resolved.reason);
      throw new ForbiddenException(resolved.reason);
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        purpose: resolved.purpose as ConversationPurpose,
        studentId: resolved.studentId,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
      include: conversationInclude,
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        purpose: resolved.purpose as ConversationPurpose,
        schoolId: resolved.schoolId,
        studentId: resolved.studentId,
        participants: { create: [{ userId }, { userId: participantId }] },
      },
      include: conversationInclude,
    });
  }

  async getConversations(userId: string) {
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: { conversation: { include: conversationInclude } },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    const ids = memberships.map((membership) => membership.conversationId);
    const messages = ids.length
      ? await this.prisma.message.findMany({
          where: { conversationId: { in: ids } },
          select: { conversationId: true, senderId: true, createdAt: true },
        })
      : [];
    const byConversation = new Map<string, Array<{ senderId: string; createdAt: Date }>>();
    for (const message of messages) {
      const list = byConversation.get(message.conversationId) ?? [];
      list.push(message);
      byConversation.set(message.conversationId, list);
    }

    return memberships.map((membership) => {
      const count = unreadCount(
        byConversation.get(membership.conversationId) ?? [],
        userId,
        membership.lastReadAt,
      );
      return {
        ...membership.conversation,
        lastReadAt: membership.lastReadAt,
        isMuted: membership.isMuted,
        unreadCount: count,
        hasUnread: count > 0,
      };
    });
  }

  async getMessages(userId: string, conversationId: string, page = 1, limit = 50) {
    await this.requireParticipant(userId, conversationId);
    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const skip = (pageNum - 1) * limitNum;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          attachments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
    ]);

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return { messages: messages.reverse(), total, page: pageNum, limit: limitNum };
  }

  async getAllowance(userId: string, conversationId: string) {
    const week = londonWeekBounds(new Date());
    const { sender, recipient, conversation } = await this.loadPair(userId, conversationId);
    const used = await this.countParentMessages(
      this.prisma,
      userId,
      sender.role,
      recipient.role,
      conversation.schoolId,
      week,
    );
    return this.presentAllowance(sender.role, recipient.role, used, week);
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const trimmed = content?.trim();
    if (!trimmed) throw new BadRequestException('Message content is required');
    const week = londonWeekBounds(new Date());

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;
      const { sender, recipient, conversation } = await this.loadPair(userId, conversationId, tx);
      if (sender.role === Role.ADMIN || sender.role === Role.STAFF) {
        throw new ForbiddenException('Office admin and other staff cannot send messages');
      }

      const used = await this.countParentMessages(tx, userId, sender.role, recipient.role, conversation.schoolId, week);
      const decision = allowanceForSend({ senderRole: sender.role, recipientRole: recipient.role, used });
      if (!decision.allowed) {
        const who = decision.scope === 'head' ? 'the head of this school' : 'teachers';
        throw new ForbiddenException(
          `Weekly limit reached. Parents may send ${decision.limit} message${decision.limit === 1 ? '' : 's'} a week to ${who}. Deleting a message does not restore the allowance. The next week starts Monday 00:00 Europe/London.`,
        );
      }

      const message = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: trimmed,
          type: 'TEXT',
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      });

      return message;
    });
  }

  async deleteMessage(userId: string, messageId: string, isAdmin = false) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    // Soft-delete keeps the row so a parent's weekly allowance is not restored.
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
    return participants.map((participant) => participant.userId);
  }

  private async requireParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant in this conversation');
    return participant;
  }

  private async loadPair(
    userId: string,
    conversationId: string,
    db: PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0] = this.prisma,
  ) {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: { id: true, role: true } } } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const sender = conversation.participants.find((participant) => participant.userId === userId);
    if (!sender) throw new ForbiddenException('Not a participant in this conversation');
    const recipient = conversation.participants.find((participant) => participant.userId !== userId);
    if (!recipient) throw new BadRequestException('Conversation has no recipient');
    return { conversation, sender: sender.user, recipient: recipient.user };
  }

  private async countParentMessages(
    db: Pick<PrismaService, 'message'>,
    senderId: string,
    senderRole: Role,
    recipientRole: Role,
    schoolId: string,
    week: LondonWeek,
  ) {
    if (senderRole !== Role.PARENT) return 0;
    if (recipientRole !== Role.TEACHER && recipientRole !== Role.HEAD) return 0;
    return db.message.count({
      where: {
        senderId,
        createdAt: { gte: week.start, lt: week.end },
        conversation: recipientRole === Role.HEAD
          ? { schoolId, participants: { some: { user: { role: Role.HEAD } } } }
          : { participants: { some: { user: { role: Role.TEACHER } } } },
      },
    });
  }

  private presentAllowance(senderRole: Role, recipientRole: Role, used: number, week: LondonWeek) {
    const decision = allowanceForSend({ senderRole, recipientRole, used });
    return {
      ...decision,
      weekStartsAt: week.start.toISOString(),
      weekEndsAt: week.end.toISOString(),
      timezone: 'Europe/London',
    };
  }

  private async loadDirectory() {
    const [userRows, studentRows, schools] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, role: true },
      }),
      this.prisma.studentProfile.findMany({
        include: {
          class: { include: { school: true, classSubjects: { include: { teacher: true } } } },
          school: true,
          parentLinks: { include: { parent: true } },
        },
      }),
      this.prisma.school.findMany({ include: { headProfile: true } }),
    ]);

    const headBySchool = new Map(schools.map((school) => [school.id, school.headProfile?.userId ?? null]));
    const headSchoolByUser = new Map(
      schools.flatMap((school) => (school.headProfile ? [[school.headProfile.userId, school.id] as const] : [])),
    );

    const teacherSchools = new Map<string, Set<string>>();
    const teacherClasses = new Map<string, Set<string>>();
    for (const student of studentRows) {
      for (const assignment of student.class?.classSubjects ?? []) {
        const teacherUserId = assignment.teacher.userId;
        const schoolsForTeacher = teacherSchools.get(teacherUserId) ?? new Set<string>();
        if (student.class?.schoolId) schoolsForTeacher.add(student.class.schoolId);
        teacherSchools.set(teacherUserId, schoolsForTeacher);
        const classesForTeacher = teacherClasses.get(teacherUserId) ?? new Set<string>();
        if (student.classId) classesForTeacher.add(student.classId);
        teacherClasses.set(teacherUserId, classesForTeacher);
      }
    }

    const assignments = await this.prisma.classSubjectTeacher.findMany({
      include: { class: true, teacher: true },
    });
    for (const assignment of assignments) {
      const schoolsForTeacher = teacherSchools.get(assignment.teacher.userId) ?? new Set<string>();
      schoolsForTeacher.add(assignment.class.schoolId);
      teacherSchools.set(assignment.teacher.userId, schoolsForTeacher);
      const classesForTeacher = teacherClasses.get(assignment.teacher.userId) ?? new Set<string>();
      classesForTeacher.add(assignment.classId);
      teacherClasses.set(assignment.teacher.userId, classesForTeacher);
    }

    const children: GraphChild[] = studentRows.flatMap((student) => {
      const schoolId = student.schoolId ?? student.class?.schoolId;
      if (!schoolId) return [];
      return [{
        studentId: student.id,
        studentUserId: student.userId,
        name: `${student.firstName} ${student.lastName}`.trim(),
        schoolId,
        classId: student.classId,
        parentUserIds: student.parentLinks.map((link) => link.parent.userId),
        teacherUserIds: [...new Set((student.class?.classSubjects ?? []).map((item) => item.teacher.userId))],
        headUserId: headBySchool.get(schoolId) ?? null,
      }];
    });

    const users: GraphUser[] = userRows.map((user) => {
      let schoolIds: string[] = [];
      let classIds: string[] = [];
      if (user.role === Role.TEACHER) {
        schoolIds = [...(teacherSchools.get(user.id) ?? [])];
        classIds = [...(teacherClasses.get(user.id) ?? [])];
      } else if (user.role === Role.HEAD) {
        const schoolId = headSchoolByUser.get(user.id);
        schoolIds = schoolId ? [schoolId] : [];
      } else if (user.role === Role.STUDENT) {
        const child = children.find((item) => item.studentUserId === user.id);
        schoolIds = child ? [child.schoolId] : [];
        classIds = child?.classId ? [child.classId] : [];
      } else if (user.role === Role.PARENT) {
        schoolIds = [...new Set(children.filter((child) => child.parentUserIds.includes(user.id)).map((child) => child.schoolId))];
      }
      return {
        userId: user.id,
        role: user.role as RoleName,
        name: `${user.firstName} ${user.lastName}`,
        schoolIds,
        classIds,
      };
    });

    return { users, children, schools };
  }
}
