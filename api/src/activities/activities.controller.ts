import { Controller, Post, Get, Param, Body, Request, Query, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller()
@UseGuards(RolesGuard)
export class ActivitiesController {
  constructor(private svc: ActivitiesService) {}

  @Get('activities')
  findAll(@Query() q: any) {
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 50, officerId: q.officerId, officeId: q.officeId, activityType: q.activityType, from: q.from, to: q.to });
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
}
