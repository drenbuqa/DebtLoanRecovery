import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import { exec } from 'child_process';
import * as https from 'https';

function dpdToNplClass(dpd: number): string {
  if (dpd <= 0)   return 'PERFORMING';
  if (dpd <= 30)  return 'WATCH';
  if (dpd <= 90)  return 'SUBSTANDARD';
  if (dpd <= 180) return 'DOUBTFUL';
  return 'LOSS';
}

@Injectable()
export class SchedulerService {
  private readonly log = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  // Ping self every 5 minutes to prevent Railway from sleeping the service
  @Cron('*/5 * * * *')
  keepAlive() {
    const url = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/health`
      : null;
    if (!url) return;
    https.get(url, (res) => res.resume()).on('error', () => { /* silent */ });
  }

  // Runs every night at 01:00 server time
  @Cron('0 1 * * *')
  async recalculateDpd() {
    this.log.log('DPD recalculation started');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loans = await this.prisma.loan.findMany({
      select: { id: true, maturityDate: true, daysPastDue: true },
    });

    let updated = 0;
    for (const loan of loans) {
      const dpd = loan.maturityDate && loan.maturityDate < today
        ? Math.floor((today.getTime() - loan.maturityDate.getTime()) / 86_400_000)
        : 0;

      if (dpd !== loan.daysPastDue) {
        await this.prisma.loan.update({
          where: { id: loan.id },
          data: {
            daysPastDue: dpd,
            nplClassification: dpdToNplClass(dpd) as any,
            dpdLastCalculatedAt: new Date(),
          },
        });
        updated++;
      }
    }

    this.log.log(`DPD recalculation complete — ${updated}/${loans.length} loans updated`);
  }

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
    const result = await this.prisma.promiseToPay.updateMany({
      where: { status: 'PENDING', promiseDate: { lt: today } },
      data: { status: 'BROKEN' },
    });
    this.log.log(`Broken promises sweep complete — ${result.count} promises marked BROKEN`);
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
