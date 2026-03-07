import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EventsService } from './events.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.eventsService.create(user.id, body);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() body: any) {
    return this.eventsService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Get()
  @ApiBearerAuth()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.eventsService.findAll(startDate, endDate);
  }

  @Get('calendar.ics')
  @Public()
  async icalFeed(@Res() res: Response) {
    const ical = await this.eventsService.getIcalFeed();
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="frannberry-events.ics"',
    });
    res.send(ical);
  }

  @Get(':id')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
}
