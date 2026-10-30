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
  portfolio(@Query('officeId') rawOfficeId: string, @Query('status') status: string, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let officeId: string | undefined = rawOfficeId;
    let officerId: string | undefined;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER') { officeId = user.officeId; }
    return this.svc.portfolioPdf({ officeId, officerId, status }, res);
  }

  @Get('payments/csv')
  paymentsCsv(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('officeId') rawOfficeId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = (req as any).user;
    let officeId: string | undefined = rawOfficeId;
    let officerId: string | undefined;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER') { officeId = user.officeId; }
    return this.svc.paymentsCsv({ dateFrom, dateTo, officeId, officerId }, res);
  }

  @Get('activities/csv')
  activitiesCsv(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('officeId') rawOfficeId: string,
    @Query('officerId') rawOfficerId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = (req as any).user;
    let officeId: string | undefined = rawOfficeId;
    let officerId: string | undefined = rawOfficerId;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.activitiesCsv({ dateFrom, dateTo, officeId, officerId }, res);
  }

  @Get('case-status/xlsx')
  caseStatusXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.caseStatusXlsx({ officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo }, res);
  }

  @Get('collections/xlsx')
  collectionsXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.collectionsXlsx({ officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo }, res);
  }

  @Get('agreement-status/xlsx')
  agreementStatusXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.agreementStatusXlsx({ officerId, officeId, status: q.status, dateFrom: q.dateFrom, dateTo: q.dateTo }, res);
  }

  @Get('overdue-installments/xlsx')
  overdueInstallmentsXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.overdueInstallmentsXlsx({ officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo }, res);
  }

  @Get('legal-cases/xlsx')
  legalCasesXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.legalCasesXlsx({ officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo }, res);
  }

  @Get('activity-log/xlsx')
  activityLogXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.activityLogXlsx({ officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo }, res);
  }

  @Get('overdue-clients/xlsx')
  overdueClientsXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let officerId: string | undefined = q.officerId;
    let officeId: string | undefined = q.officeId;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.overdueClientsXlsx({ officerId, officeId }, res);
  }

  @Get('promises/xlsx')
  promisesXlsx(@Query() q: any, @Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    let { officerId, officeId } = q;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.promisesXlsx({ officerId, officeId, dateFrom: q.dateFrom, dateTo: q.dateTo, status: q.status }, res);
  }
}
