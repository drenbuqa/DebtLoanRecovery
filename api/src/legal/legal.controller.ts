import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { LegalService } from './legal.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('legal')
@UseGuards(RolesGuard)
export class LegalController {
  constructor(private svc: LegalService, private audit: AuditService) {}

  @Get()
  findAll(@Query() q: any, @Request() req: any) {
    const user = req.user;
    let officerId: string | undefined;
    let { officeId } = q;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 25, status: q.status, view: q.view, officeId, officerId });
  }

  @Get('by-case/:caseId')
  findByCaseId(@Param('caseId') caseId: string) { return this.svc.findByCaseId(caseId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async create(@Body() dto: any, @Request() req: any) {
    const result = await this.svc.create(dto);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'CREATE_LEGAL_PROCEEDING', entity: 'LegalProceeding', entityId: result.id,
      details: `${result.proceedingRef} on case ${dto.caseId}`,
    });
    return result;
  }

  @Patch(':id')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    const result = await this.svc.update(id, dto);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'UPDATE_LEGAL_PROCEEDING', entity: 'LegalProceeding', entityId: id,
      details: `Updated fields: ${Object.keys(dto).join(', ')}`,
    });
    return result;
  }
}
