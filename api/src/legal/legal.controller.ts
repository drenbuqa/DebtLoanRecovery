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
    let officerId: string | undefined;
    let { officeId } = q;
    if (user?.role === 'OFFICER' || user?.role === 'MANAGER') { officerId = user.id; officeId = undefined; }
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 25, status: q.status, view: q.view, officeId, officerId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
}
