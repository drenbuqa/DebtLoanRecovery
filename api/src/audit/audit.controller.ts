import { Controller, Get, Query, Request, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  list(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('Regjistri i auditimit është vetëm për administratorët');
    return this.svc.list({
      userId, action, from, to,
      take: take ? parseInt(take) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }
}
