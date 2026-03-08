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
import { ConferencesService } from './conferences.service';
import { Role } from '@prisma/client';

@ApiTags('Conferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conferences')
export class ConferencesController {
  constructor(private conferencesService: ConferencesService) {}

  @Post('slots')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Create available conference slots (teacher)' })
  async createSlots(
    @CurrentUser('id') userId: string,
    @Body() body: { date: string; slots: { startTime: string; endTime: string }[]; location?: string; meetingUrl?: string },
  ) {
    return this.conferencesService.createSlots(userId, body);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available conference slots' })
  async getAvailable(
    @Query('teacherId') teacherId?: string,
    @Query('from') fromDate?: string,
  ) {
    return this.conferencesService.getAvailableSlots(teacherId, fromDate);
  }

  @Post(':slotId/book')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Book a conference slot (parent)' })
  async book(
    @CurrentUser('id') userId: string,
    @Param('slotId') slotId: string,
    @Body() body: { studentId: string; notes?: string },
  ) {
    return this.conferencesService.bookSlot(userId, slotId, body);
  }

  @Patch(':slotId/cancel')
  @Roles(Role.TEACHER, Role.PARENT, Role.ADMIN)
  @ApiOperation({ summary: 'Cancel a conference slot or booking' })
  async cancel(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('slotId') slotId: string,
  ) {
    return this.conferencesService.cancelSlot(userId, slotId, role);
  }

  @Get('my')
  @Roles(Role.TEACHER, Role.PARENT, Role.ADMIN)
  @ApiOperation({ summary: 'Get my conferences' })
  async getMy(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.conferencesService.getMyConferences(userId, role);
  }
}
