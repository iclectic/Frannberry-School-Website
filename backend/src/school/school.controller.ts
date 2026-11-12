import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SchoolService } from './school.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
}
