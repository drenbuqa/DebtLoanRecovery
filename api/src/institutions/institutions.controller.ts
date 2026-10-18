import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('institutions')
@UseGuards(RolesGuard)
export class InstitutionsController {
  constructor(private svc: InstitutionsService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get('stats')
  stats(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const user = req.user;
    let officeId: string | undefined;
    let officerId: string | undefined;
    if (user?.role === 'OFFICER') { officerId = user.id; }
    else if (user?.role === 'MANAGER') { officeId = user.officeId; }
    return this.svc.stats({ from, to, officeId, officerId });
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
