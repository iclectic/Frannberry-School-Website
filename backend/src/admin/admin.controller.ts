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
import { AdminService } from './admin.service';
import { Role } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ── Users ───────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async getAllUsers(@Query('page') page?: number, @Query('limit') limit?: number, @Query('role') role?: Role) {
    return this.adminService.getAllUsers(page, limit, role);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a user' })
  async createUser(
    @CurrentUser('id') adminId: string,
    @Body() body: { email: string; password: string; firstName: string; lastName: string; role: Role },
  ) {
    return this.adminService.createUser(adminId, body);
  }

  @Patch('users/:userId/toggle-active')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  async toggleUserActive(@CurrentUser('id') adminId: string, @Param('userId') userId: string) {
    return this.adminService.toggleUserActive(adminId, userId);
  }

  // ── Parent-Student Linking ──────────────────────────────────────────────────

  @Post('link-parent-student')
  @ApiOperation({ summary: 'Link a parent to a student' })
  async linkParentStudent(
    @CurrentUser('id') adminId: string,
    @Body() body: { parentUserId: string; studentUserId: string; relation?: string },
  ) {
    return this.adminService.linkParentStudent(adminId, body.parentUserId, body.studentUserId, body.relation);
  }

  // ── Classes ─────────────────────────────────────────────────────────────────

  @Get('classes')
  @ApiOperation({ summary: 'List all classes' })
  async getAllClasses() {
    return this.adminService.getAllClasses();
  }

  @Post('classes')
  @ApiOperation({ summary: 'Create a class' })
  async createClass(
    @CurrentUser('id') adminId: string,
    @Body() body: { name: string; year: number; section?: string; capacity?: number },
  ) {
    return this.adminService.createClass(adminId, body);
  }

  @Post('classes/assign-teacher')
  @ApiOperation({ summary: 'Assign a teacher to a class subject' })
  async assignTeacher(
    @CurrentUser('id') adminId: string,
    @Body() body: { teacherUserId: string; classId: string; subjectId: string },
  ) {
    return this.adminService.assignTeacherToClass(adminId, body.teacherUserId, body.classId, body.subjectId);
  }

  @Post('classes/assign-student')
  @ApiOperation({ summary: 'Assign a student to a class' })
  async assignStudent(
    @CurrentUser('id') adminId: string,
    @Body() body: { studentUserId: string; classId: string },
  ) {
    return this.adminService.assignStudentToClass(adminId, body.studentUserId, body.classId);
  }

  // ── Subjects ────────────────────────────────────────────────────────────────

  @Get('subjects')
  @ApiOperation({ summary: 'List all subjects' })
  async getAllSubjects() {
    return this.adminService.getAllSubjects();
  }

  @Post('subjects')
  @ApiOperation({ summary: 'Create a subject' })
  async createSubject(
    @CurrentUser('id') adminId: string,
    @Body() body: { name: string; code: string; description?: string },
  ) {
    return this.adminService.createSubject(adminId, body);
  }

  // ── Sessions & Terms ────────────────────────────────────────────────────────

  @Get('sessions')
  @ApiOperation({ summary: 'List all academic sessions with terms' })
  async getSessions() {
    return this.adminService.getSessions();
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create an academic session' })
  async createSession(
    @CurrentUser('id') adminId: string,
    @Body() body: { name: string; startDate: string; endDate: string; isCurrent?: boolean },
  ) {
    return this.adminService.createSession(adminId, body);
  }

  @Post('terms')
  @ApiOperation({ summary: 'Create a term' })
  async createTerm(
    @CurrentUser('id') adminId: string,
    @Body() body: { name: string; sessionId: string; startDate: string; endDate: string; isCurrent?: boolean },
  ) {
    return this.adminService.createTerm(adminId, body);
  }

  // ── Grading ─────────────────────────────────────────────────────────────────

  @Get('grading-scales')
  @ApiOperation({ summary: 'List grading scales' })
  async getGradingScales() {
    return this.adminService.getGradingScales();
  }

  @Post('grading-scales')
  @ApiOperation({ summary: 'Create a grading scale entry' })
  async createGradingScale(
    @CurrentUser('id') adminId: string,
    @Body() body: { name: string; minScore: number; maxScore: number; grade: string; remark?: string },
  ) {
    return this.adminService.createGradingScale(adminId, body);
  }

  // ── Invites ─────────────────────────────────────────────────────────────────

  @Post('invites')
  @ApiOperation({ summary: 'Create an invite code' })
  async createInvite(
    @CurrentUser('id') adminId: string,
    @Body() body: { email: string; role: Role },
  ) {
    return this.adminService.createInvite(adminId, body);
  }
}
