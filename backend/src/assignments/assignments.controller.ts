import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, UpdateAssignmentDto, SubmitAssignmentDto, GradeSubmissionDto } from './dto/assignment.dto';
import { Role } from '@prisma/client';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Create an assignment (teacher)' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(userId, dto);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update an assignment (teacher)' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(userId, id, dto);
  }

  @Get('class/:classId')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get assignments for a class (teacher/admin)' })
  async getForClass(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('classId') classId: string,
  ) {
    return this.assignmentsService.getForClass(userId, classId, role);
  }

  @Get('student/:studentProfileId')
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @ApiOperation({ summary: 'Get assignments for a student' })
  async getForStudent(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.assignmentsService.getForStudent(userId, studentProfileId, role);
  }

  @Get(':id/submissions')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get assignment with all submissions (teacher)' })
  async getOneWithSubmissions(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.assignmentsService.getOneWithSubmissions(userId, id);
  }

  @Post(':id/submit')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Submit work for an assignment (student)' })
  async submitWork(
    @CurrentUser('id') userId: string,
    @Param('id') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignmentsService.submitWork(userId, assignmentId, dto);
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Grade a submission (teacher)' })
  async gradeSubmission(
    @CurrentUser('id') userId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.assignmentsService.gradeSubmission(userId, submissionId, dto);
  }
}
