import { Controller, Get, Post, Body, Query, Request, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('caseId') caseId?: string,
    @Query('officerId') officerId?: string,
    @Query('officeId') officeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.svc.findAll({ page: page ? +page : undefined, limit: limit ? +limit : undefined, caseId, officerId, officeId, dateFrom, dateTo });
  }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  register(@Body() body: any, @Request() req: any) {
    return this.svc.register({ ...body, officerId: body.officerId ?? req.user?.id });
  }
}
