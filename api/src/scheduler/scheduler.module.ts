import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaveModule } from '../leave/leave.module';

@Module({
  imports: [PrismaModule, LeaveModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
