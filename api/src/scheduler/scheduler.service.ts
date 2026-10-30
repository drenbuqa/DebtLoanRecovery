import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveService } from '../leave/leave.service';
import * as path from 'path';
import { exec } from 'child_process';


@Injectable()
export class SchedulerService {
  private readonly log = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService, private leaveService: LeaveService) {}

  // Runs every night at 01:30 — mark unpaid installments whose due date has passed as OVERDUE
  @Cron('30 1 * * *')
  async markOverdueInstallments() {
    this.log.log('Installment OVERDUE sweep started');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await this.prisma.agreementInstallment.updateMany({
      where: { status: 'PENDING', dueDate: { lt: today } },
      data: { status: 'OVERDUE' },
    });
    this.log.log(`Installment OVERDUE sweep complete — ${result.count} installments marked OVERDUE`);
  }

  @Cron('45 1 * * *')
  async markBrokenPromises() {
    this.log.log('Broken promises sweep started');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find newly-broken promises (still PENDING, date passed) with their case officer
    const newlyBroken = await this.prisma.promiseToPay.findMany({
      where: { status: 'PENDING', promiseDate: { lt: today } },
      select: {
        id: true,
        promisedAmount: true,
        promiseDate: true,
        caseId: true,
        case: { select: { caseReference: true, assignedOfficerId: true, loan: { select: { borrower: { select: { fullName: true } } } } } },
      },
    });

    if (newlyBroken.length > 0) {
      await this.prisma.promiseToPay.updateMany({
        where: { id: { in: newlyBroken.map(p => p.id) } },
        data: { status: 'BROKEN' },
      });

      // Group by officer — one notification per officer listing all broken promises
      const byOfficer = new Map<string, typeof newlyBroken>();
      for (const p of newlyBroken) {
        const officerId = p.case.assignedOfficerId;
        if (!officerId) continue;
        if (!byOfficer.has(officerId)) byOfficer.set(officerId, []);
        byOfficer.get(officerId)!.push(p);
      }

      const notifs: { userId: string; title: string; body?: string; link: string }[] = [];
      for (const [officerId, promises] of byOfficer) {
        if (promises.length === 1) {
          const p = promises[0];
          const borrower = p.case.loan?.borrower?.fullName ?? p.case.caseReference;
          notifs.push({
            userId: officerId,
            title: `Premtim pagese i thyer — ${borrower}`,
            body: `Data e premtimit ${new Date(p.promiseDate).toLocaleDateString('sq-AL')} kaloi pa pagesë`,
            link: `/cases/${p.caseId}`,
          });
        } else {
          notifs.push({
            userId: officerId,
            title: `${promises.length} premtime pagese të thyera sot`,
            body: promises.map(p => p.case.loan?.borrower?.fullName ?? p.case.caseReference).slice(0, 5).join(', ') + (promises.length > 5 ? ` +${promises.length - 5} të tjerë` : ''),
            link: `/cases`,
          });
        }
      }

      if (notifs.length > 0) {
        await this.prisma.notification.createMany({ data: notifs });
      }
    }

    this.log.log(`Broken promises sweep complete — ${newlyBroken.length} promises marked BROKEN`);
  }

  // Runs every night at 01:40 — notify officers when their agreements break
  @Cron('40 1 * * *')
  async notifyBrokenAgreements() {
    this.log.log('Broken agreements notification sweep started');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Agreements that are still ACTIVE but have an overdue installment that became overdue today
    const newlyOverdue = await this.prisma.agreementInstallment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: today },
        agreement: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        agreement: {
          select: {
            id: true,
            agreementReference: true,
            case: { select: { id: true, caseReference: true, assignedOfficerId: true, loan: { select: { borrower: { select: { fullName: true } } } } } },
          },
        },
      },
    });

    // Collect unique agreements (one agreement may have multiple overdue installments)
    const seenAgreements = new Map<string, typeof newlyOverdue[0]['agreement']>();
    for (const inst of newlyOverdue) {
      if (!seenAgreements.has(inst.agreement.id)) {
        seenAgreements.set(inst.agreement.id, inst.agreement);
      }
    }

    const byOfficer = new Map<string, typeof newlyOverdue[0]['agreement'][]>();
    for (const agreement of seenAgreements.values()) {
      const officerId = agreement.case.assignedOfficerId;
      if (!officerId) continue;
      if (!byOfficer.has(officerId)) byOfficer.set(officerId, []);
      byOfficer.get(officerId)!.push(agreement);
    }

    const notifs: { userId: string; title: string; body?: string; link: string }[] = [];
    for (const [officerId, agreements] of byOfficer) {
      if (agreements.length === 1) {
        const a = agreements[0];
        const borrower = a.case.loan?.borrower?.fullName ?? a.case.caseReference;
        notifs.push({
          userId: officerId,
          title: `Marrëveshja u thye — ${borrower}`,
          body: `Këst i papaguar · ${a.agreementReference}`,
          link: `/cases/${a.case.id}`,
        });
      } else {
        notifs.push({
          userId: officerId,
          title: `${agreements.length} marrëveshje të thyera sot`,
          body: agreements.map(a => a.case.loan?.borrower?.fullName ?? a.case.caseReference).slice(0, 5).join(', ') + (agreements.length > 5 ? ` +${agreements.length - 5} të tjera` : ''),
          link: `/cases`,
        });
      }
    }

    if (notifs.length > 0) {
      await this.prisma.notification.createMany({ data: notifs });
    }

    this.log.log(`Broken agreements notification sweep complete — ${seenAgreements.size} agreements, ${notifs.length} notifications sent`);
  }

  // June 1 at midnight: apply annual leave cap (forfeits balance > 6 days)
  @Cron('0 0 1 6 *')
  async applyJuneCap() {
    const year = new Date().getFullYear();
    this.log.log(`June cap sweep started for year ${year}`);
    await this.leaveService.applyJuneCap(year);
    this.log.log(`June cap sweep complete for year ${year}`);
  }

  // Runs every night at 02:00 server time
  @Cron('0 2 * * *')
  runBackup() {
    const script = path.join(process.cwd(), 'scripts', 'backup.sh');
    exec(`bash "${script}"`, (err, stdout, stderr) => {
      if (err) {
        this.log.error(`Backup failed: ${err.message}`);
        this.log.error(stderr);
      } else {
        this.log.log(`Backup complete:\n${stdout.trim()}`);
      }
    });
  }
}
