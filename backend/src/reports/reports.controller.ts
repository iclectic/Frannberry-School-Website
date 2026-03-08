import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { Role } from '@prisma/client';
import { Response } from 'express';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('enrollment')
  @ApiOperation({ summary: 'Enrollment stats report' })
  async enrollment() {
    return this.reportsService.enrollmentReport();
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Attendance summary report' })
  async attendance(
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.attendanceReport(classId, from, to);
  }

  @Get('fees')
  @ApiOperation({ summary: 'Fee collection report' })
  async fees() {
    return this.reportsService.feeReport();
  }

  @Get('grades')
  @ApiOperation({ summary: 'Grade distribution report' })
  async grades(
    @Query('termId') termId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.reportsService.gradeReport(termId, classId);
  }

  @Get('export/users')
  @ApiOperation({ summary: 'Export users as CSV' })
  async exportUsers(@Res() res: Response, @Query('role') role?: string) {
    const csv = await this.reportsService.exportUsersCsv(role);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
    res.send(csv);
  }

  @Get('export/attendance')
  @ApiOperation({ summary: 'Export attendance as CSV' })
  async exportAttendance(
    @Res() res: Response,
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.reportsService.exportAttendanceCsv(classId, from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.csv');
    res.send(csv);
  }
}
