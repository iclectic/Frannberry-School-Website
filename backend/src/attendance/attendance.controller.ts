import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('mark')
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  mark(
    @CurrentUser() user: any,
    @Body() body: {
      classId: string;
      date: string;
      records: { studentId: string; status: string; remark?: string }[];
    },
  ) {
    return this.attendanceService.markAttendance(user.id, body.classId, body.date, body.records);
  }

  @Get('class/:classId')
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  getByClass(
    @Param('classId') classId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getByClassAndDate(classId, date);
  }

  @Get('student/:studentId')
  getByStudent(
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getStudentAttendance(studentId, startDate, endDate);
  }

  @Get('my')
  getMy(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getMyAttendance(user.id, user.role, startDate, endDate);
  }
}
