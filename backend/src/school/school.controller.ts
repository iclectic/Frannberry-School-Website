import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SchoolService } from './school.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('School')
@Controller('school')
export class SchoolController {
  constructor(private schoolService: SchoolService) {}

  @Public()
  @Get('phases')
  @ApiOperation({ summary: 'List the trust schools, ages, and the key stages each school may teach' })
  listPhases() {
    return this.schoolService.listPhases();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schools, class, and children for the signed-in user' })
  me(@CurrentUser('id') userId: string) {
    return this.schoolService.me(userId);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in headteacher’s own school: classes, teachers, and pupils' })
  dashboard(@CurrentUser('id') userId: string) {
    return this.schoolService.headDashboard(userId);
  }

  @Get('children/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'A parent’s view of their own child, including a nursery child who cannot sign in' })
  child(@CurrentUser('id') userId: string, @Param('studentId') studentId: string) {
    return this.schoolService.childForParent(userId, studentId);
  }
}
