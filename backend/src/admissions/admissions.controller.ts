import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdmissionsService } from './admissions.service';
import { CreateApplicationDto, EnrolApplicationDto } from './dto';

@ApiTags('Admissions')
@Controller('admissions')
export class AdmissionsController {
  constructor(private admissions: AdmissionsService) {}

  @Public()
  @Post('applications')
  @ApiOperation({ summary: 'Apply to Nursery, Primary, or Secondary' })
  submit(@Body() body: CreateApplicationDto) {
    return this.admissions.submit(body);
  }

  @Get('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Applications for the office, or for the signed-in headteacher’s school' })
  list(@CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    return this.admissions.list(userId, role);
  }

  @Post('applications/:id/enrol')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Offer a place: a pupil record, and a login only for Primary or Secondary' })
  enrol(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Body() body: EnrolApplicationDto,
  ) {
    return this.admissions.enrol(userId, role, id, body);
  }

  @Post('applications/:id/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decline an application in the office’s list or the headteacher’s school' })
  decline(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.admissions.decline(userId, role, id);
  }
}
