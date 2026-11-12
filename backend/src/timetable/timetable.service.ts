import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeachingScopeService } from '../teaching/teaching-scope.service';
import { groupByPlacement, matchesPlacement } from '../teaching/scope';
import { phaseRule } from '../school/phase-rules';

@Injectable()
export class TimetableService {
  constructor(
    private prisma: PrismaService,
    private teachingScope: TeachingScopeService,
  ) {}

  async createSlot(data: {
    classId: string;
    subjectId: string;
    teacherId: string;
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }) {
    return this.prisma.timetableSlot.create({
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        day: data.day as any,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        class: { select: { id: true, name: true, section: true } },
      },
    });
  }

  async updateSlot(id: string, data: Partial<{
    subjectId: string;
    teacherId: string;
    day: string;
    startTime: string;
    endTime: string;
    room: string;
  }>) {
    const slot = await this.prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Timetable slot not found');

    return this.prisma.timetableSlot.update({
      where: { id },
      data: {
        ...(data.subjectId && { subjectId: data.subjectId }),
        ...(data.teacherId && { teacherId: data.teacherId }),
        ...(data.day && { day: data.day as any }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.room !== undefined && { room: data.room }),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        class: { select: { id: true, name: true, section: true } },
      },
    });
  }

  async deleteSlot(id: string) {
    const slot = await this.prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Timetable slot not found');
    return this.prisma.timetableSlot.delete({ where: { id } });
  }

  async getClassTimetable(userId: string, role: string, classId: string) {
    await this.assertCanUseClass(userId, role, classId);
    return this.slotsForClass(classId);
  }

  async getTeacherTimetable(teacherId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { teacherId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, section: true } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getMy(userId: string, role: string) {
    const scope = await this.teachingScope.forUser(userId, role);
    if (scope.audience === 'all') {
      const slots = await this.prisma.timetableSlot.findMany({
        include: this.slotInclude(),
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
      });
      const shaped = slots.map((slot) => this.shapeSlot(slot));
      const groups = new Map<string, { schoolName: string; keyStage: string; className: string; slots: typeof shaped }>();
      for (const slot of shaped) {
        const existing = groups.get(slot.classId);
        if (existing) existing.slots.push(slot);
        else groups.set(slot.classId, { schoolName: slot.schoolName, keyStage: slot.keyStage, className: slot.class.name, slots: [slot] });
      }
      return {
        groups: [...groups.values()].map((group) => ({
          pupilId: null,
          pupilName: null,
          schoolName: group.schoolName,
          phase: null,
          keyStage: group.keyStage,
          className: group.className,
          slots: group.slots,
        })),
      };
    }
    const classIds = [...new Set(scope.placements.map((placement) => placement.classId).filter((id): id is string => !!id))];
    const slots = classIds.length
      ? await this.prisma.timetableSlot.findMany({
          where: { classId: { in: classIds } },
          include: this.slotInclude(),
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        })
      : [];
    const shaped = slots.map((slot) => this.shapeSlot(slot));
    const groups = groupByPlacement(shaped, scope.placements, 'class').map((group) => ({
      pupilId: group.placement.pupilId,
      pupilName: group.placement.pupilName,
      schoolName: group.placement.schoolName,
      phase: group.placement.phase,
      keyStage: group.placement.keyStage,
      className: group.placement.className,
      slots: group.items,
    }));
    return { groups };
  }

  private async slotsForClass(classId: string) {
    const slots = await this.prisma.timetableSlot.findMany({
      where: { classId },
      include: this.slotInclude(),
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
    return slots.map((slot) => this.shapeSlot(slot));
  }

  private slotInclude() {
    return {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      class: { select: { id: true, name: true, section: true, keyStage: true, schoolId: true, school: { select: { phase: true, name: true } } } },
    };
  }

  private shapeSlot(slot: {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    room: string | null;
    classId: string;
    subject: { id: string; name: string; code: string };
    teacher: { user: { id: string; firstName: string; lastName: string } };
    class: { id: string; name: string; section: string | null; keyStage: string; schoolId: string; school: { phase: string; name: string } };
  }) {
    const rule = phaseRule(slot.class.school.phase);
    return {
      ...slot,
      schoolId: slot.class.schoolId,
      keyStage: slot.class.keyStage,
      classId: slot.classId,
      schoolName: rule?.name ?? slot.class.school.name,
    };
  }

  private async assertCanUseClass(userId: string, role: string, classId: string) {
    if (role === 'ADMIN') return;
    const scope = await this.teachingScope.forUser(userId, role);
    const schoolClass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!schoolClass) throw new NotFoundException('Class not found');
    const allowed = scope.placements.some((placement) =>
      matchesPlacement(
        { schoolId: schoolClass.schoolId, keyStage: schoolClass.keyStage, classId: schoolClass.id },
        placement,
        role === 'HEAD' ? 'stage' : 'class',
      ),
    );
    if (!allowed) throw new ForbiddenException('This class is outside your school');
  }
}
