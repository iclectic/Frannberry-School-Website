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
import { ResultsService } from './results.service';
import { CreateResultDto, UpdateResultDto } from './dto/result.dto';
import { Role } from '@prisma/client';

@ApiTags('Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Enter a result (teacher)' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateResultDto) {
    return this.resultsService.create(userId, dto);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update a result (teacher)' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateResultDto,
  ) {
    return this.resultsService.update(userId, id, dto);
  }

  @Get('student/:studentProfileId')
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @ApiOperation({ summary: 'Get results for a student' })
  async getForStudent(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('studentProfileId') studentProfileId: string,
    @Query('termId') termId?: string,
  ) {
    return this.resultsService.getForStudent(userId, studentProfileId, role, termId);
  }

  @Get('class/:classId')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get results for a class (teacher)' })
  async getForClass(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.resultsService.getForClass(userId, classId, termId);
  }
}
