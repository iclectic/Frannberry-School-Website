import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor(private config: ConfigService) {
    this.from = this.config.get<string>('MAIL_FROM', 'noreply@frannberry.school');

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER', ''),
        pass: this.config.get<string>('SMTP_PASS', ''),
      },
      // Don't fail in development if SMTP isn't configured
      ignoreTLS: true,
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Frannberry School" <${this.from}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.warn(`Failed to send email to ${to}: ${error.message}`);
      // Don't throw — email failure shouldn't break the main flow
      return null;
    }
  }

  // ── Pre-built email templates ─────────────────────────────────────────────

  async sendPasswordReset(to: string, firstName: string, resetLink: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">🏫 Frannberry School</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p>Dear ${firstName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="background: #1e40af; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this, you can safely ignore this email. The link expires in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Frannberry School &bull; Do not reply to this email.</p>
        </div>
      </div>`;
    return this.sendMail(to, 'Reset Your Password – Frannberry School', html);
  }

  async sendAssignmentDeadline(to: string, firstName: string, assignmentTitle: string, dueDate: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">🏫 Frannberry School</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p>Dear ${firstName},</p>
          <p>This is a reminder that the following assignment is due soon:</p>
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px;">${assignmentTitle}</h3>
            <p style="margin: 0; color: #dc2626; font-weight: bold;">Due: ${dueDate}</p>
          </div>
          <p>Please ensure your work is submitted before the deadline.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Frannberry School &bull; Do not reply to this email.</p>
        </div>
      </div>`;
    return this.sendMail(to, `Assignment Reminder: ${assignmentTitle}`, html);
  }

  async sendResultPublished(to: string, firstName: string, termName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">🏫 Frannberry School</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p>Dear ${firstName},</p>
          <p>We are pleased to inform you that the <strong>${termName}</strong> results have been published.</p>
          <p>You can view the results by logging into the school portal.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${this.config.get('CORS_ORIGIN', 'http://localhost:3000')}/portal/results" 
               style="background: #1e40af; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              View Results
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Frannberry School &bull; Do not reply to this email.</p>
        </div>
      </div>`;
    return this.sendMail(to, `${termName} Results Published – Frannberry School`, html);
  }

  async sendFeeInvoice(to: string, firstName: string, feeName: string, amount: string, dueDate: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">🏫 Frannberry School</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p>Dear ${firstName},</p>
          <p>A new fee invoice has been issued:</p>
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px;">${feeName}</h3>
            <p style="margin: 0;">Amount: <strong>£${amount}</strong></p>
            <p style="margin: 4px 0 0; color: #dc2626;">Due: ${dueDate}</p>
          </div>
          <p>Please log in to the portal to view details and make payment.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Frannberry School &bull; Do not reply to this email.</p>
        </div>
      </div>`;
    return this.sendMail(to, `Fee Invoice: ${feeName}`, html);
  }
}
