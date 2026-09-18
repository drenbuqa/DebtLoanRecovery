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
    // institutionId can be passed as a filter; no role-scoping needed — all roles see institution stats
    return this.svc.institutionStats({ from: q.from, to: q.to, institutionId: q.institutionId });
  }
}
