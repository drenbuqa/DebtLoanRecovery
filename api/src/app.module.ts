import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ReportsModule } from './reports/reports.module';
import { ImportModule } from './import/import.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CasesModule } from './cases/cases.module';
import { ActivitiesModule } from './activities/activities.module';
import { PaymentsModule } from './payments/payments.module';
import { AgreementsModule } from './agreements/agreements.module';
import { LegalModule } from './legal/legal.module';
import { TasksModule } from './tasks/tasks.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { OfficesModule } from './offices/offices.module';
import { PerformanceModule } from './performance/performance.module';
import { DocumentsModule } from './documents/documents.module';
import { AuditModule } from './audit/audit.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CasesModule,
    ActivitiesModule,
    PaymentsModule,
    AgreementsModule,
    LegalModule,
    TasksModule,
    InstitutionsModule,
    OfficesModule,
    PerformanceModule,
    DocumentsModule,
    AuditModule,
    SchedulerModule,
    ReportsModule,
    ImportModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
