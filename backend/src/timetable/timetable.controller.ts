import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Timetable')
@ApiBearerAuth()
@Controller('timetable')
export class TimetableController {
  constructor(private timetableService: TimetableService) {}

  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  create(@Body() body: {
    classId: string;
    subjectId: string;
    teacherId: string;
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }) {
    return this.timetableService.createSlot(body);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() body: any) {
    return this.timetableService.updateSlot(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.timetableService.deleteSlot(id);
  }

  @Get('class/:classId')
  getByClass(@Param('classId') classId: string) {
    return this.timetableService.getClassTimetable(classId);
  }

  @Get('teacher/:teacherId')
  getByTeacher(@Param('teacherId') teacherId: string) {
    return this.timetableService.getTeacherTimetable(teacherId);
  }

  @Get('my')
  getMy(@CurrentUser() user: any) {
    if (user.role === 'STUDENT') {
      return this.timetableService.getStudentTimetable(user.id);
    }
    if (user.role === 'TEACHER') {
      return this.timetableService.getTeacherTimetable(user.teacherProfileId);
    }
    return [];
  }
}
