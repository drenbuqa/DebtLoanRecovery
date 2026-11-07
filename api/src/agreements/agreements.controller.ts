import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('agreements')
@UseGuards(RolesGuard)
export class AgreementsController {
  constructor(private svc: AgreementsService, private audit: AuditService) {}

  @Get()
  findAll(@Query() q: any, @Request() req: any) {
    const user = req.user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 25, caseId: q.caseId, status: q.status, officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async create(@Body() dto: any, @Request() req: any) {
    const result = await this.svc.create(dto);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'CREATE_AGREEMENT', entity: 'Agreement', entityId: result.id,
      details: `${result.agreementReference} — ${result.totalAmount} ${result.currency} on case ${dto.caseId}`,
    });
    return result;
  }

  @Patch(':id/status')
  @RequireRoles('ADMIN', 'MANAGER')
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    const result = await this.svc.updateStatus(id, status);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'UPDATE_AGREEMENT_STATUS', entity: 'Agreement', entityId: id,
      details: `Status → ${status}`,
    });
    return result;
  }

  @Patch('installments/:id/pay')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async payInstallment(@Param('id') id: string, @Body('paidAmount') paidAmount: number | undefined, @Request() req: any) {
    const result = await this.svc.markInstallmentPaid(id, paidAmount, req.user?.id);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'PAY_INSTALLMENT', entity: 'AgreementInstallment', entityId: id,
      details: paidAmount !== undefined ? `Amount: ${paidAmount}` : 'Full installment paid',
    });
    return result;
  }
}
