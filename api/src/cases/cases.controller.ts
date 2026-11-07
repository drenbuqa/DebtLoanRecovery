import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { CasesService } from './cases.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';
import { CreateCaseDto } from './dto/create-case.dto';

@Controller('cases')
@UseGuards(RolesGuard)
export class CasesController {
  constructor(private svc: CasesService, private audit: AuditService) {}

  @Get('dashboard-stats')
  dashboardStats(@Request() req: any, @Query('officeId') officeId?: string, @Query('officerId') officerId?: string) {
    const user = req.user;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER') { officeId = user.officeId; officerId = undefined; }
    return this.svc.getDashboardStats(officeId, officerId);
  }

  @Get('search-person')
  searchPerson(@Query('personalId') personalId: string) {
    return this.svc.searchPerson(personalId);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('collectionStatus') collectionStatus?: string,
    @Query('institutionId') institutionId?: string,
    @Query('officeId') officeId?: string,
    @Query('officerId') officerId?: string,
    @Query('view') view?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const user = req.user;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') {
      officerId = user.id;
      officeId = undefined;
    }
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search, status, stage, collectionStatus, institutionId, officeId, officerId, view, from, to,
    });
  }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async create(@Body() dto: CreateCaseDto, @Request() req: any) {
    const result = await this.svc.createCase(dto, req.user?.id);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'CREATE_CASE', entity: 'Case', entityId: result.id,
      details: `Case ${result.caseReference} created`,
    });
    return result;
  }

  @Get(':id/history')
  history(@Param('id') id: string) { return this.svc.getHistory(id); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id/status')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async updateStatus(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const result = await this.svc.updateStatus(id, body, req.user?.id);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'UPDATE_CASE_STATUS', entity: 'Case', entityId: id,
      details: body.status ? `Status → ${body.status}` : `Stage → ${body.collectionStage ?? body.collectionStatus}`,
    });
    return result;
  }

  @Patch(':id/next-action')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  updateNextAction(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateNextAction(id, body);
  }

  @Patch(':id')
  @RequireRoles('ADMIN', 'MANAGER')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    const result = await this.svc.updateCase(id, dto);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'UPDATE_CASE', entity: 'Case', entityId: id,
      details: `Updated fields: ${Object.keys(dto).join(', ')}`,
    });
    return result;
  }

  @Patch(':id/assign')
  @RequireRoles('ADMIN', 'MANAGER')
  async assign(@Param('id') id: string, @Body('officerId') officerId: string, @Request() req: any) {
    const result = await this.svc.assignOfficer(id, officerId, req.user?.id);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'ASSIGN_CASE', entity: 'Case', entityId: id,
      details: `Assigned to officer ${officerId}`,
    });
    return result;
  }

  @Post(':id/archive')
  @RequireRoles('ADMIN')
  async archive(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const result = await this.svc.archiveCase(id, req.user.id, reason);
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'ARCHIVE_CASE', entity: 'Case', entityId: id,
      details: `Reason: ${reason}`,
    });
    return result;
  }

  @Post('admin/recalculate-next-action')
  @RequireRoles('ADMIN')
  recalculateNextAction() {
    return this.svc.recalculateAllNextActionDates();
  }
}
