import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LegalService } from './legal.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('legal')
@UseGuards(RolesGuard)
export class LegalController {
  constructor(private svc: LegalService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll({ page: +q.page || 1, limit: +q.limit || 25, status: q.status, officeId: q.officeId });
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
