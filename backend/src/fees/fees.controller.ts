import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeesService } from './fees.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Fees')
@ApiBearerAuth()
@Controller('fees')
export class FeesController {
  constructor(private feesService: FeesService) {}

  // ── Templates ─────────────────────────────────────────────────────────────

  @Post('templates')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  createTemplate(@Body() body: any) {
    return this.feesService.createTemplate(body);
  }

  @Get('templates')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  getTemplates() {
    return this.feesService.getTemplates();
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  @Post('invoices/generate')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  generateInvoices(@Body('feeTemplateId') feeTemplateId: string) {
    return this.feesService.generateInvoices(feeTemplateId);
  }

  @Get('invoices')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  getInvoices(
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.feesService.getInvoices({ studentId, status });
  }

  @Get('invoices/:id')
  getInvoiceById(@Param('id') id: string) {
    return this.feesService.getInvoiceById(id);
  }

  @Get('my')
  getMy(@CurrentUser() user: any) {
    return this.feesService.getMyFees(user.id, user.role);
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  @Post('payments')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  recordPayment(@CurrentUser() user: any, @Body() body: any) {
    return this.feesService.recordPayment(user.id, body);
  }
}
