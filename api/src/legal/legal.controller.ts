import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { LegalService } from './legal.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('legal')
@UseGuards(RolesGuard)
export class LegalController {
  constructor(private svc: LegalService) {}

  @Get()
  findAll(@Query() q: any, @Request() req: any) {
    const user = req.user;
    let { officeId } = q;
    if (user?.role === 'OFFICER' || (user?.role === 'MANAGER' && !officeId)) { officeId = user.officeId; }
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 25, status: q.status, view: q.view, officeId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  @RequireRoles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
}
