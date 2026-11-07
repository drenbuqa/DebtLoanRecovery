import { Controller, Post, Get, Delete, Patch, Param, Body, Request, Query, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller()
@UseGuards(RolesGuard)
export class ActivitiesController {
  constructor(private svc: ActivitiesService, private audit: AuditService) {}

  @Get('activities')
  findAll(@Request() req: any, @Query() q: any) {
    const user = req.user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 50, officerId, officeId, activityType: q.activityType, from: q.from, to: q.to });
  }

  @Post('cases/:caseId/activities')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async log(@Param('caseId') caseId: string, @Body() body: any, @Request() req: any) {
    const result = await this.svc.logActivity({ ...body, caseId, officerId: body.officerId ?? req.user?.id });
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'LOG_ACTIVITY', entity: 'Activity', entityId: result.id,
      details: `${body.activityType} on case ${caseId}`,
    });
    return result;
  }

  @Get('cases/:caseId/activities')
  list(@Param('caseId') caseId: string) {
    return this.svc.findByCaseId(caseId);
  }

  @Patch('activities/:id')
  @RequireRoles('ADMIN', 'MANAGER')
  async update(@Param('id') id: string, @Body() body: { notes?: string; channel?: string; occurredAt?: string }, @Request() req: any) {
    const result = await this.svc.updateActivity(id, body);
    await this.audit.log({
      userId: req.user?.id, username: req.user?.username,
      action: 'UPDATE_ACTIVITY', entity: 'Activity', entityId: id,
      details: `Updated fields: ${Object.keys(body).join(', ')}`,
    });
    return result;
  }

  @Delete('activities/:id')
  @RequireRoles('ADMIN')
  async remove(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const result = await this.svc.deleteActivity(id, req.user.id, reason);
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'DELETE_ACTIVITY', entity: 'Activity', entityId: id,
      details: `Reason: ${reason}`,
    });
    return result;
  }

  @Post('activities/backfill-promise-received')
  @RequireRoles('ADMIN')
  backfill() {
    return this.svc.backfillPromiseReceivedActivities();
  }
}
