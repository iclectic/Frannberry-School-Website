import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as PDFDocument from 'pdfkit';
import { pupilName } from '../common/pupil-name';

@Injectable()
export class ReportCardsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async generate(studentId: string, termId: string, teacherComment?: string, principalComment?: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        class: { select: { id: true, name: true, section: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      include: { session: { select: { name: true } } },
    });
    if (!term) throw new NotFoundException('Term not found');

    // Aggregate results for this student+term
    const results = await this.prisma.result.findMany({
      where: { studentId, termId },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    const gradingScales = await this.prisma.gradingScale.findMany({
      orderBy: { minScore: 'desc' },
    });

    const subjectCount = results.length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore = subjectCount > 0 ? Math.round((totalScore / subjectCount) * 100) / 100 : 0;

    // Determine overall grade from average
    let overallGrade = '—';
    for (const scale of gradingScales) {
      if (averageScore >= scale.minScore && averageScore <= scale.maxScore) {
        overallGrade = scale.grade;
        break;
      }
    }

    const reportCard = await this.prisma.reportCard.upsert({
      where: { studentId_termId: { studentId, termId } },
      update: {
        classId: student.classId!,
        totalScore,
        averageScore,
        subjectCount,
        overallGrade,
        teacherComment,
        principalComment,
      },
      create: {
        studentId,
        termId,
        classId: student.classId!,
        totalScore,
        averageScore,
        subjectCount,
        overallGrade,
        teacherComment,
        principalComment,
      },
    });

    const name = pupilName(student);
    if (student.userId) {
      await this.notificationsService.create({
        userId: student.userId,
        type: 'RESULT',
        title: 'Report Card Available',
        body: `Your report card for ${term.name} (${term.session.name}) is now available.`,
        link: '/portal/report-cards',
      });
    }

    // Notify parents
    const parentLinks = await this.prisma.parentStudent.findMany({
      where: { studentId },
      include: { parent: { select: { userId: true } } },
    });
    for (const link of parentLinks) {
      await this.notificationsService.create({
        userId: link.parent.userId,
        type: 'RESULT',
        title: 'Report Card Available',
        body: `${name.firstName} ${name.lastName}'s report card for ${term.name} is ready.`,
        link: '/portal/report-cards',
      });
    }

    return { reportCard, results, student, term };
  }

  async getByStudent(studentId: string) {
    return this.prisma.reportCard.findMany({
      where: { studentId },
      include: {
        term: { include: { session: { select: { name: true } } } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async getOne(id: string) {
    const card = await this.prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, section: true } },
          },
        },
        term: { include: { session: { select: { name: true } } } },
        class: { select: { name: true, section: true } },
      },
    });
    if (!card) throw new NotFoundException('Report card not found');

    const results = await this.prisma.result.findMany({
      where: { studentId: card.studentId, termId: card.termId },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    const gradingScales = await this.prisma.gradingScale.findMany({
      orderBy: { minScore: 'desc' },
    });

    return { ...card, results, gradingScales };
  }

  async getMy(userId: string, role: string) {
    if (role === 'STUDENT') {
      const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
      if (!student) return [];
      return this.getByStudent(student.id);
    }

    if (role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findUnique({
        where: { userId },
        include: { childLinks: { select: { studentId: true } } },
      });
      if (!parent) return [];
      const all = [];
      for (const link of parent.childLinks) {
        const cards = await this.getByStudent(link.studentId);
        const student = await this.prisma.studentProfile.findUnique({
          where: { id: link.studentId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });
        all.push({ student, reportCards: cards });
      }
      return all;
    }

    return [];
  }

  async generatePdf(id: string): Promise<Buffer> {
    const data = await this.getOne(id);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('FRANNBERRY SCHOOL', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Excellence in Education', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold').text('REPORT CARD', { align: 'center' });
      doc.moveDown();

      // Student info
      doc.fontSize(10).font('Helvetica');
      const named = pupilName(data.student);
      const studentName = `${named.firstName} ${named.lastName}`;
      const className = `${data.class.name}${data.class.section ? ' ' + data.class.section : ''}`;
      const termName = `${data.term.name} — ${data.term.session.name}`;

      doc.text(`Student: ${studentName}`, 50);
      doc.text(`Class: ${className}`, 50);
      doc.text(`Term: ${termName}`, 50);
      doc.moveDown();

      // Results table
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 250;
      const col3 = 350;
      const col4 = 430;
      const rowHeight = 22;

      // Table header
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Subject', col1, tableTop);
      doc.text('Score', col2, tableTop);
      doc.text('Max', col3, tableTop);
      doc.text('Grade', col4, tableTop);

      doc.moveTo(col1, tableTop + 15).lineTo(520, tableTop + 15).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(9);
      let y = tableTop + rowHeight;

      for (const result of data.results) {
        // Determine grade
        let grade = '—';
        const pct = (result.score / result.maxScore) * 100;
        for (const scale of data.gradingScales) {
          if (pct >= scale.minScore && pct <= scale.maxScore) {
            grade = scale.grade;
            break;
          }
        }

        doc.text(result.subject.name, col1, y);
        doc.text(result.score.toString(), col2, y);
        doc.text(result.maxScore.toString(), col3, y);
        doc.text(grade, col4, y);
        y += rowHeight;

        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }

      // Summary line
      doc.moveTo(col1, y).lineTo(520, y).stroke();
      y += 8;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Total: ${data.totalScore}`, col1, y);
      doc.text(`Average: ${data.averageScore}%`, col2, y);
      doc.text(`Grade: ${data.overallGrade}`, col4, y);

      y += 30;

      // Comments
      if (data.teacherComment) {
        doc.font('Helvetica-Bold').fontSize(10).text("Form Teacher's Comment:", col1, y);
        y += 15;
        doc.font('Helvetica').fontSize(9).text(data.teacherComment, col1, y, { width: 470 });
        y = doc.y + 15;
      }

      if (data.principalComment) {
        doc.font('Helvetica-Bold').fontSize(10).text("Principal's Comment:", col1, y);
        y += 15;
        doc.font('Helvetica').fontSize(9).text(data.principalComment, col1, y, { width: 470 });
      }

      doc.end();
    });
  }
}
