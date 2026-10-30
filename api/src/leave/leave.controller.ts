import {
  Controller, Get, Post, Patch, Delete, Param, Body, Request,
  UseGuards, Query,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

@Controller('leave')
@UseGuards(RolesGuard)
export class LeaveController {
  constructor(private svc: LeaveService) {}

  // ── Employee endpoints ──

  @Get('my-balance')
  myBalance(@Request() req: any) {
    return this.svc.getBalance(req.user.id);
  }

  @Get('my-requests')
  myRequests(@Request() req: any) {
    return this.svc.listRequests(req.user.id, false);
  }

  @Post('request')
  createRequest(@Request() req: any, @Body() body: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    return this.svc.createRequest(req.user.id, body as any);
  }

  @Patch('request/:id/cancel')
  cancelRequest(@Param('id') id: string, @Request() req: any) {
    return this.svc.cancelRequest(id, req.user.id);
  }

  // ── Admin endpoints ──

  @Get('admin/pending')
  @RequireRoles('ADMIN')
  pendingRequests() {
    return this.svc.listPendingRequests();
  }

  @Get('admin/all-requests')
  @RequireRoles('ADMIN')
  allRequests() {
    return this.svc.listRequests('any', true);
  }

  @Get('admin/staff')
  @RequireRoles('ADMIN')
  staffBalances() {
    return this.svc.listStaffBalances();
  }

  @Patch('admin/request/:id/review')
  @RequireRoles('ADMIN')
  reviewRequest(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { approved: boolean; note?: string },
  ) {
    return this.svc.reviewRequest(id, req.user.id, body.approved, body.note);
  }

  @Post('admin/balance')
  @RequireRoles('ADMIN')
  setBalance(
    @Request() req: any,
    @Body() body: { userId: string; initialDays: number; initialDate: string },
  ) {
    return this.svc.setBalance(req.user.id, body.userId, body.initialDays, body.initialDate);
  }

  @Post('admin/adjustment')
  @RequireRoles('ADMIN')
  createAdjustment(
    @Request() req: any,
    @Body() body: { userId: string; days: number; note: string },
  ) {
    return this.svc.createAdjustment(req.user.id, body.userId, body.days, body.note);
  }

  @Get('admin/adjustments/:userId')
  @RequireRoles('ADMIN')
  listAdjustments(@Param('userId') userId: string) {
    return this.svc.listAdjustments(userId);
  }
}
