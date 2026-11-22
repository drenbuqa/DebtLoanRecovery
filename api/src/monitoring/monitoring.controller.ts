import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('monitoring')
@UseGuards(RolesGuard)
@RequireRoles('ADMIN', 'MANAGER')
export class MonitoringController {
  constructor(private svc: MonitoringService) {}

  @Get('officers')
  officers(@Query('officeId') officeId?: string) {
    return this.svc.officerList({ officeId });
  }

  @Get('officers/:id')
  officerDetail(@Param('id') id: string) {
    return this.svc.officerDetail(id);
  }
}
