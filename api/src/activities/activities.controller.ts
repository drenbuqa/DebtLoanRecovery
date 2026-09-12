import { Controller, Post, Get, Delete, Param, Body, Request, Query, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller()
@UseGuards(RolesGuard)
export class ActivitiesController {
  constructor(private svc: ActivitiesService) {}

  @Get('activities')
  findAll(@Request() req: any, @Query() q: any) {
    const user = req.user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 50, officerId, officeId, activityType: q.activityType, from: q.from, to: q.to });
  }

  @Post('cases/:caseId/activities')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  log(@Param('caseId') caseId: string, @Body() body: any, @Request() req: any) {
    return this.svc.logActivity({ ...body, caseId, officerId: body.officerId ?? req.user?.id });
  }

  @Get('cases/:caseId/activities')
  list(@Param('caseId') caseId: string) {
    return this.svc.findByCaseId(caseId);
  }

  @Delete('activities/:id')
  @RequireRoles('ADMIN')
  remove(@Param('id') id: string) {
    return this.svc.deleteActivity(id);
  }
}
