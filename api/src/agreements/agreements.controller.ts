import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('agreements')
@UseGuards(RolesGuard)
export class AgreementsController {
  constructor(private svc: AgreementsService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 25, caseId: q.caseId, status: q.status, officerId: q.officerId, officeId: q.officeId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id/status')
  @RequireRoles('ADMIN', 'MANAGER')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateStatus(id, status);
  }

  @Patch('installments/:id/pay')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  payInstallment(@Param('id') id: string, @Body('paidAmount') paidAmount?: number) {
    return this.svc.markInstallmentPaid(id, paidAmount);
  }
}
