import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        mfaEnabled: true,
        createdAt: true,
        teacherProfile: true,
        studentProfile: { include: { class: true, parentLinks: { include: { parent: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } } } } },
        parentProfile: { include: { childLinks: { include: { student: { include: { user: { select: { firstName: true, lastName: true, email: true } }, class: true } } } } } },
        staffProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getMyChildren(userId: string) {
    const parent = await this.prisma.parentProfile.findUnique({
      where: { userId },
      include: {
        childLinks: {
          include: {
            student: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                class: true,
              },
            },
          },
        },
      },
    });

    if (!parent) throw new NotFoundException('Parent profile not found');
    return parent.childLinks.map((link) => ({
      ...link.student,
      relation: link.relation,
    }));
  }

  async getMyStudents(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        classSubjects: {
          include: {
            class: {
              include: {
                students: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                  },
                },
              },
            },
            subject: true,
          },
        },
      },
    });

    if (!teacher) throw new NotFoundException('Teacher profile not found');
    return teacher.classSubjects;
  }

  async verifyTeacherOwnsClass(userId: string, classId: string, subjectId?: string): Promise<boolean> {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) return false;

    const where: any = { teacherId: teacher.id, classId };
    if (subjectId) where.subjectId = subjectId;

    const assignment = await this.prisma.classSubjectTeacher.findFirst({ where });
    return !!assignment;
  }

  async verifyParentOwnsStudent(userId: string, studentProfileId: string): Promise<boolean> {
    const parent = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });
    if (!parent) return false;

    const link = await this.prisma.parentStudent.findFirst({
      where: { parentId: parent.id, studentId: studentProfileId },
    });
    return !!link;
  }

  async verifyStudentIdentity(userId: string, studentProfileId: string): Promise<boolean> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    return student?.id === studentProfileId;
  }

  async getTeacherProfileId(userId: string): Promise<string | null> {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return teacher?.id ?? null;
  }

  async getStudentProfileId(userId: string): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }
}
