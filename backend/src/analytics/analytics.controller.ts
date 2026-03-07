import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('student/:studentId/trends')
  getStudentTrends(@Param('studentId') studentId: string) {
    return this.analyticsService.getStudentTrends(studentId);
  }

  @Get('class/:classId/averages')
  getClassAverages(
    @Param('classId') classId: string,
    @Query('termId') termId?: string,
  ) {
    return this.analyticsService.getClassAverages(classId, termId);
  }

  @Get('student/:studentId/comparison')
  getSubjectComparison(
    @Param('studentId') studentId: string,
    @Query('termId') termId?: string,
  ) {
    return this.analyticsService.getSubjectComparison(studentId, termId);
  }

  @Get('my/trends')
  async getMyTrends(@CurrentUser() user: any) {
    const student = await this.analyticsService['prisma'].studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!student) return [];
    return this.analyticsService.getStudentTrends(student.id);
  }

  @Get('my/comparison')
  async getMyComparison(
    @CurrentUser() user: any,
    @Query('termId') termId?: string,
  ) {
    const student = await this.analyticsService['prisma'].studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!student) return [];
    return this.analyticsService.getSubjectComparison(student.id, termId);
  }
}
