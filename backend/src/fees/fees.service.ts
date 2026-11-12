import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { pupilName } from '../common/pupil-name';

let invoiceCounter = 1000;

@Injectable()
export class FeesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ── Fee Templates ───────────────────────────────────────────────────────────

  async createTemplate(data: {
    name: string;
    description?: string;
    amount: number;
    termId?: string;
    classId?: string;
    dueDate?: string;
  }) {
    return this.prisma.feeTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        termId: data.termId,
        classId: data.classId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        term: { select: { name: true } },
        class: { select: { name: true, section: true } },
      },
    });
  }

  async getTemplates() {
    return this.prisma.feeTemplate.findMany({
      include: {
        term: { select: { name: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Invoices ────────────────────────────────────────────────────────────────

  async generateInvoices(feeTemplateId: string) {
    const template = await this.prisma.feeTemplate.findUnique({
      where: { id: feeTemplateId },
      include: { class: true },
    });
    if (!template) throw new NotFoundException('Fee template not found');

    // Find students to invoice
    const where: any = {};
    if (template.classId) where.classId = template.classId;

    const students = await this.prisma.studentProfile.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    const invoices = [];
    for (const student of students) {
      // Skip if invoice already exists
      const existing = await this.prisma.invoice.findFirst({
        where: { studentId: student.id, feeTemplateId },
      });
      if (existing) continue;

      invoiceCounter++;
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNo: `INV-${new Date().getFullYear()}-${invoiceCounter}`,
          studentId: student.id,
          feeTemplateId,
          amount: template.amount,
          dueDate: template.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      invoices.push(invoice);

      const name = pupilName(student);
      if (student.userId) {
        await this.notificationsService.create({
          userId: student.userId,
          type: 'FEE',
          title: 'New Fee Invoice',
          body: `An invoice of £${template.amount.toFixed(2)} for "${template.name}" has been issued.`,
          link: '/portal/fees',
        });
      }

      // Notify parents
      const parentLinks = await this.prisma.parentStudent.findMany({
        where: { studentId: student.id },
        include: { parent: { select: { userId: true } } },
      });
      for (const link of parentLinks) {
        await this.notificationsService.create({
          userId: link.parent.userId,
          type: 'FEE',
          title: 'New Fee Invoice',
          body: `An invoice of £${template.amount.toFixed(2)} for "${template.name}" has been issued for ${name.firstName} ${name.lastName}.`,
          link: '/portal/fees',
        });
      }
    }

    return { generated: invoices.length, invoices };
  }

  async getInvoices(filters?: { studentId?: string; status?: string }) {
    const where: any = {};
    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.invoice.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        feeTemplate: { select: { name: true } },
        payments: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getMyFees(userId: string, role: string) {
    if (role === 'STUDENT') {
      const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
      if (!student) return [];
      return this.getInvoices({ studentId: student.id });
    }

    if (role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findUnique({
        where: { userId },
        include: { childLinks: { select: { studentId: true } } },
      });
      if (!parent) return [];
      const all = [];
      for (const link of parent.childLinks) {
        const invoices = await this.getInvoices({ studentId: link.studentId });
        const student = await this.prisma.studentProfile.findUnique({
          where: { id: link.studentId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });
        all.push({ student, invoices });
      }
      return all;
    }

    return [];
  }

  // ── Payments ────────────────────────────────────────────────────────────────

  async recordPayment(recordedById: string, data: {
    invoiceId: string;
    amount: number;
    method?: string;
    reference?: string;
    note?: string;
  }) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: (data.method as any) || 'OTHER',
        reference: data.reference,
        note: data.note,
        recordedById,
      },
    });

    // Update invoice
    const newAmountPaid = invoice.amountPaid + data.amount;
    const newStatus = newAmountPaid >= invoice.amount ? 'PAID' : 'PARTIAL';

    await this.prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { amountPaid: newAmountPaid, status: newStatus as any },
    });

    return payment;
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        feeTemplate: { select: { name: true, description: true } },
        payments: {
          include: { recordedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { paidAt: 'desc' },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}
