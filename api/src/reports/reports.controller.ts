import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('reports')
@UseGuards(RolesGuard)
@RequireRoles('ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('case/:id/pdf')
  caseDetail(@Param('id') id: string, @Res() res: Response) {
    return this.svc.caseDetailPdf(id, res);
  }

  @Get('portfolio/pdf')
  portfolio(@Query('officeId') officeId: string, @Query('status') status: string, @Res() res: Response) {
    return this.svc.portfolioPdf({ officeId, status }, res);
  }

  @Get('payments/csv')
  paymentsCsv(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('officeId') officeId: string,
    @Res() res: Response,
  ) {
    return this.svc.paymentsCsv({ dateFrom, dateTo, officeId }, res);
  }

  @Get('activities/csv')
  activitiesCsv(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('officeId') officeId: string,
    @Query('officerId') officerId: string,
    @Res() res: Response,
  ) {
    return this.svc.activitiesCsv({ dateFrom, dateTo, officeId, officerId }, res);
  }
}
