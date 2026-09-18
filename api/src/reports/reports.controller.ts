import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('reports')
@UseGuards(RolesGuard)
@RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
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

  @Get('case-status/xlsx')
  caseStatusXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.caseStatusXlsx({ officerId, officeId }, res);
  }

  @Get('collections/xlsx')
  collectionsXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.collectionsXlsx({ officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo }, res);
  }

  @Get('agreement-status/xlsx')
  agreementStatusXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.agreementStatusXlsx({ officerId, officeId, status: q.status }, res);
  }
}
