import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('institutions')
@UseGuards(RolesGuard)
export class InstitutionsController {
  constructor(private svc: InstitutionsService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get('stats')
  stats(@Query('from') from?: string, @Query('to') to?: string, @Req() req: any) {
    const user = req.user;
    let officeId: string | undefined;
    if (user?.role === 'MANAGER') { officeId = user.officeId; }
    return this.svc.stats({ from, to, officeId });
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  @RequireRoles('ADMIN')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id')
  @RequireRoles('ADMIN')
  remove(@Param('id') id: string) { return this.svc.delete(id); }
}
