import { Controller, Get, Post, Patch, Param, Body, Query, Request, ForbiddenException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private svc: UsersService,
    private audit: AuditService,
  ) {}

  // Stats: management only
  @Get('stats')
  @RequireRoles('ADMIN', 'MANAGER')
  stats() { return this.svc.stats(); }

  // User list: officers need it for case/task dropdowns; VIEWERs do not
  @Get()
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  findAll(@Query('officeId') officeId?: string, @Query('isActive') isActive?: string) {
    return this.svc.findAll({ officeId, isActive: isActive !== undefined ? isActive === 'true' : undefined });
  }

  @Get(':id')
  @RequireRoles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequireRoles('ADMIN')
  async create(@Body() body: CreateUserDto, @Request() req: any) {
    const user = await this.svc.create(body);
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'USER_CREATE', entity: 'User', entityId: user.id,
      details: `Created ${body.username} with role ${body.role}`,
    });
    return user;
  }

  @Patch(':id')
  @RequireRoles('ADMIN')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @Request() req: any) {
    const keys = Object.keys(body).filter((k) => (body as any)[k] !== undefined);

    const user = await this.svc.update(id, body);
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'USER_UPDATE', entity: 'User', entityId: id,
      details: `Updated fields: ${keys.join(', ')}`,
    });
    return user;
  }

  @Patch(':id/deactivate')
  @RequireRoles('ADMIN')
  async deactivate(@Param('id') id: string, @Request() req: any) {
    // Prevent an admin from deactivating themselves
    if (id === req.user.id) throw new ForbiddenException('Nuk mund të çaktivizoni llogarinë tuaj');
    const user = await this.svc.deactivate(id);
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'USER_DEACTIVATE', entity: 'User', entityId: id,
      details: `Deactivated ${user.fullName}`,
    });
    return user;
  }
}
