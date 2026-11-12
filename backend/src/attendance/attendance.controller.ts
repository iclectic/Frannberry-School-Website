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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('classes')
  @Roles('TEACHER', 'ADMIN', 'HEAD')
  @UseGuards(RolesGuard)
  classes(@CurrentUser() user: any) {
    return this.attendanceService.classesFor(user.id, user.role);
  }

  @Post('mark')
  @Roles('TEACHER', 'ADMIN', 'HEAD')
  @UseGuards(RolesGuard)
  mark(
    @CurrentUser() user: any,
    @Body() body: {
      classId: string;
      date: string;
      records: { studentId: string; status: string; remark?: string }[];
    },
  ) {
    return this.attendanceService.markAttendance(user.id, user.role, body.classId, body.date, body.records);
  }

  @Get('class/:classId')
  @Roles('TEACHER', 'ADMIN', 'HEAD')
  @UseGuards(RolesGuard)
  getByClass(
    @CurrentUser() user: any,
    @Param('classId') classId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getByClassAndDate(user.id, user.role, classId, date);
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
