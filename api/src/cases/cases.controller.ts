import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { CasesService } from './cases.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';
import { CreateCaseDto } from './dto/create-case.dto';

@Controller('cases')
@UseGuards(RolesGuard)
export class CasesController {
  constructor(private svc: CasesService) {}

  @Get('dashboard-stats')
  dashboardStats(@Query('officeId') officeId?: string) { return this.svc.getDashboardStats(officeId); }

  @Get('search-person')
  searchPerson(@Query('personalId') personalId: string) {
    return this.svc.searchPerson(personalId);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('institutionId') institutionId?: string,
    @Query('officeId') officeId?: string,
    @Query('officerId') officerId?: string,
    @Query('view') view?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const user = req.user;
    // Officers can only see their own cases regardless of query params
    if (user?.role === 'OFFICER') {
      officerId = user.id;
      officeId = undefined;
    }
    // Managers can only see their own office
    if (user?.role === 'MANAGER' && !officeId) {
      officeId = user.officeId;
    }
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search, status, stage, institutionId, officeId, officerId, view, from, to,
    });
  }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  create(@Body() dto: CreateCaseDto, @Request() req: any) {
    return this.svc.createCase(dto, req.user?.id);
  }

  @Get(':id/history')
  history(@Param('id') id: string) { return this.svc.getHistory(id); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id/status')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  updateStatus(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.svc.updateStatus(id, body, req.user?.id);
  }

  @Patch(':id/next-action')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  updateNextAction(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateNextAction(id, body);
  }

  @Patch(':id')
  @RequireRoles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateCase(id, dto);
  }

  @Patch(':id/assign')
  @RequireRoles('ADMIN', 'MANAGER')
  assign(@Param('id') id: string, @Body('officerId') officerId: string, @Request() req: any) {
    return this.svc.assignOfficer(id, officerId, req.user?.id);
  }

  @Get(':id/delete-preview')
  @RequireRoles('ADMIN', 'MANAGER')
  deletePreview(@Param('id') id: string) {
    return this.svc.deletePreview(id);
  }

  @Delete(':id')
  @RequireRoles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.svc.deleteCase(id);
  }
}
