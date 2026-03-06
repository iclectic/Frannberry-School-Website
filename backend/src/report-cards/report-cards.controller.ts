import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportCardsService } from './report-cards.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Report Cards')
@ApiBearerAuth()
@Controller('report-cards')
export class ReportCardsController {
  constructor(private reportCardsService: ReportCardsService) {}

  @Post('generate')
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  generate(@Body() body: {
    studentId: string;
    termId: string;
    teacherComment?: string;
    principalComment?: string;
  }) {
    return this.reportCardsService.generate(
      body.studentId,
      body.termId,
      body.teacherComment,
      body.principalComment,
    );
  }

  @Get('my')
  getMy(@CurrentUser() user: any) {
    return this.reportCardsService.getMy(user.id, user.role);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.reportCardsService.getOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.reportCardsService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
