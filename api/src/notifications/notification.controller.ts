import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { RolesGuard } from '../auth/roles.guard';

@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationController {
  constructor(private svc: NotificationService) {}

  @Get()
  list(@Request() req: any) {
    return this.svc.list(req.user.id);
  }

  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.svc.unreadCount(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: any) {
    return this.svc.markRead(id, req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.svc.markAllRead(req.user.id);
  }
}
