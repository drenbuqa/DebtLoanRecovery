import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { RolesGuard } from '../auth/roles.guard';

@Controller('performance')
@UseGuards(RolesGuard)
export class PerformanceController {
  constructor(private svc: PerformanceService) {}

  @Get('officers')
  officers(@Query() q: any, @Req() req: any) {
    const user = req.user;
    let { officerId, officeId } = q;
    // Officer sees only their own performance
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.officerStats({ from: q.from, to: q.to, officeId, officerId });
  }

  @Get('offices')
  offices(@Query() q: any) {
    return this.svc.officeStats({ from: q.from, to: q.to });
  }

  @Get('institutions')
  institutions(@Query() q: any, @Req() req: any) {
    const user = req.user;
    let officerId: string | undefined;
    let officeId: string | undefined = q.officeId;
    if (user?.role === 'OFFICER') { officerId = user.id; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.institutionStats({ from: q.from, to: q.to, institutionId: q.institutionId, officerId, officeId });
  }

  @Get('activity-trend')
  activityTrend(@Query() q: any, @Req() req: any) {
    const user = req.user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.activityTrend({ from: q.from, to: q.to, officeId, officerId });
  }
}
