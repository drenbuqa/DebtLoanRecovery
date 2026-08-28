import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('tasks')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private svc: TasksService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll({
      page: +q.page || 1,
      limit: +q.limit || 50,
      caseId: q.caseId,
      assignedToId: q.assignedToId,
      officeId: q.officeId,
      completed: q.completed === 'true' ? true : q.completed === 'false' ? false : undefined,
    });
  }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  create(@Body() dto: any, @Request() req: any) {
    return this.svc.create(dto, req.user?.id);
  }

  @Patch(':id/complete')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  complete(@Param('id') id: string) { return this.svc.complete(id); }

  @Patch(':id/uncomplete')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  uncomplete(@Param('id') id: string) { return this.svc.uncomplete(id); }

  @Patch(':id')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
}
