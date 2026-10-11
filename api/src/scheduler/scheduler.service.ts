import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import { exec } from 'child_process';


@Injectable()
export class SchedulerService {
  private readonly log = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

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
