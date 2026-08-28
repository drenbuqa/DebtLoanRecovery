import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('institutions')
@UseGuards(RolesGuard)
export class InstitutionsController {
  constructor(private svc: InstitutionsService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get('stats') stats() { return this.svc.stats(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  @RequireRoles('ADMIN')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
}
