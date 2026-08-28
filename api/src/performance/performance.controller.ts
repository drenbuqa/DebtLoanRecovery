import { Controller, Get, Query } from '@nestjs/common';
import { PerformanceService } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private svc: PerformanceService) {}

  @Get('officers')
  officers(@Query() q: any) {
    return this.svc.officerStats({ from: q.from, to: q.to, officeId: q.officeId });
  }

  @Get('offices')
  offices(@Query() q: any) {
    return this.svc.officeStats({ from: q.from, to: q.to });
  }
}
