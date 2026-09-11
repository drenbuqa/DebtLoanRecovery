import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';
import { RegisterPaymentDto } from './dto/register-payment.dto';

@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('caseId') caseId?: string,
    @Query('officerId') officerId?: string,
    @Query('officeId') officeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = req.user;
    if (user?.role === 'OFFICER') { officerId = user.id; officeId = undefined; }
    else if (user?.role === 'MANAGER' && !officeId) { officeId = user.officeId; }
    return this.svc.findAll({ page: page ? +page : undefined, limit: limit ? +limit : undefined, caseId, officerId, officeId, dateFrom, dateTo });
  }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  register(@Body() body: RegisterPaymentDto, @Request() req: any) {
    return this.svc.register({ ...body, officerId: req.user?.id });
  }

  @Patch(':id/void')
  @RequireRoles('ADMIN', 'MANAGER')
  void(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    return this.svc.voidPayment(id, reason, req.user.id);
  }
}
