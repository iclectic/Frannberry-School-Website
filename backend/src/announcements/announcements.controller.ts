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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnnouncementsService } from './announcements.service';
import { Role, AnnouncementScope } from '@prisma/client';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'Create an announcement' })
  async create(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      title: string;
      content: string;
      scope: AnnouncementScope;
      classId?: string;
      publishAt?: string;
    },
  ) {
    return this.announcementsService.create(userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get announcements' })
  async getAll(
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
    @Query('classId') classId?: string,
  ) {
    return this.announcementsService.getAll(role, userId, classId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update an announcement' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; isPublished?: boolean },
  ) {
    return this.announcementsService.update(userId, id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an announcement' })
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.announcementsService.delete(userId, id);
  }
}
