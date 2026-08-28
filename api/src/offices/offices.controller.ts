import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OfficesService } from './offices.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('offices')
@UseGuards(RolesGuard)
export class OfficesController {
  constructor(private svc: OfficesService) {}

  @Get() findAll() { return this.svc.findAll(); }

  @Post()
  @RequireRoles('ADMIN')
  create(@Body() dto: any) { return this.svc.create(dto); }
}
