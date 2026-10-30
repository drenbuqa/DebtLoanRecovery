import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveType, LeaveStatus, LeaveAdjustmentType } from '@prisma/client';

// Kosovo public holidays (fixed dates, month is 1-indexed)
const KS_HOLIDAYS: { month: number; day: number }[] = [
  { month: 1, day: 1 },
  { month: 1, day: 2 },
  { month: 1, day: 7 },
  { month: 2, day: 17 },
  { month: 4, day: 9 },
  { month: 5, day: 1 },
  { month: 5, day: 9 },
  { month: 6, day: 12 },
  { month: 11, day: 28 },
  { month: 11, day: 29 },
  { month: 12, day: 25 },
];

function isKsHoliday(d: Date): boolean {
  return KS_HOLIDAYS.some(h => h.month === d.getMonth() + 1 && h.day === d.getDate());
}

function isWorkingDay(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6 && !isKsHoliday(d);
}

function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);
  while (cur <= endNorm) {
    if (isWorkingDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// First day of the month after date
function firstOfNextMonth(d: Date): Date {
  const r = new Date(d);
  r.setDate(1);
  r.setMonth(r.getMonth() + 1);
  r.setHours(0, 0, 0, 0);
  return r;
}

export interface BalanceResult {
  hasBalance: boolean;
  initialDays: number;
  initialDate: string | null;
  accrued: number;
  usedAnnual: number;
  usedSick: number;
  usedUnpaid: number;
  adjustmentsTotal: number;
  balance: number;
  pendingAnnualDays: number;
}

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  /** Compute current leave balance for a user */
  async computeBalance(userId: string, systemUserId?: string): Promise<BalanceResult> {
    const lb = await this.prisma.leaveBalance.findUnique({ where: { userId } });
    if (!lb) {
      return { hasBalance: false, initialDays: 0, initialDate: null, accrued: 0, usedAnnual: 0, usedSick: 0, usedUnpaid: 0, adjustmentsTotal: 0, balance: 0, pendingAnnualDays: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allRequests, adjustments] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { userId, status: { in: ['APPROVED', 'PENDING'] } },
        orderBy: { endDate: 'asc' },
      }),
      this.prisma.leaveAdjustment.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
    ]);

    const approvedAnnual = allRequests.filter(r => r.leaveType === 'ANNUAL' && r.status === 'APPROVED');
    const pendingAnnual = allRequests.filter(r => r.leaveType === 'ANNUAL' && r.status === 'PENDING');
    const approvedSick = allRequests.filter(r => r.leaveType === 'SICK' && r.status === 'APPROVED');
    const approvedUnpaid = allRequests.filter(r => r.leaveType === 'UNPAID' && r.status === 'APPROVED');

    const usedAnnual = approvedAnnual.reduce((s, r) => s + r.workingDays, 0);
    const usedSick = approvedSick.reduce((s, r) => s + r.workingDays, 0);
    const usedUnpaid = approvedUnpaid.reduce((s, r) => s + r.workingDays, 0);
    const pendingAnnualDays = pendingAnnual.reduce((s, r) => s + r.workingDays, 0);

    // Event-based balance calculation
    const initialDate = new Date(lb.initialDate);
    initialDate.setHours(0, 0, 0, 0);

    // Build accrual events (1st of each month after initialDate up to today)
    let balance = lb.initialDays;
    let totalAccrued = 0;
    const newCaps: { year: number; days: number }[] = [];

    let cur = firstOfNextMonth(initialDate);
    while (cur <= today) {
      balance += 1.5;
      totalAccrued += 1.5;

      // June cap: after June 1st accrual
      if (cur.getMonth() === 5) {
        const capYear = cur.getFullYear();
        const existingCap = adjustments.find(a => a.type === 'JUNE_CAP' && a.capYear === capYear);
        if (existingCap) {
          balance += existingCap.days; // negative
        } else if (balance > 6) {
          const excess = balance - 6;
          newCaps.push({ year: capYear, days: -excess });
          balance = 6;
        }
      }

      // Apply approved annual leave where endDate falls in this month
      for (const req of approvedAnnual) {
        const endD = new Date(req.endDate);
        endD.setHours(0, 0, 0, 0);
        const sameYearMonth = endD.getFullYear() === cur.getFullYear() && endD.getMonth() === cur.getMonth();
        if (sameYearMonth) {
          balance -= req.workingDays;
        }
      }

      // Apply manual adjustments in this month
      for (const adj of adjustments) {
        if (adj.type !== 'JUNE_CAP') {
          const adjD = new Date(adj.date);
          adjD.setHours(0, 0, 0, 0);
          if (adjD.getFullYear() === cur.getFullYear() && adjD.getMonth() === cur.getMonth()) {
            balance += adj.days;
          }
        }
      }

      cur.setMonth(cur.getMonth() + 1);
    }

    // Apply leave requests with endDate before firstOfNextMonth(initialDate) (edge case)
    // These are requests entirely within or before the initial month
    for (const req of approvedAnnual) {
      const endD = new Date(req.endDate);
      endD.setHours(0, 0, 0, 0);
      if (endD < firstOfNextMonth(initialDate)) {
        balance -= req.workingDays;
      }
    }

    // Persist any new June caps we found
    if (newCaps.length > 0 && systemUserId) {
      const adminUser = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const capCreatorId = systemUserId || adminUser?.id;
      if (capCreatorId) {
        for (const cap of newCaps) {
          try {
            await this.prisma.leaveAdjustment.create({
              data: {
                userId,
                days: cap.days,
                type: 'JUNE_CAP',
                note: `Automatikisht: bilanci ka kaluar 6 ditë në Qershor ${cap.year}`,
                date: new Date(`${cap.year}-06-01`),
                capYear: cap.year,
                createdById: capCreatorId,
              },
            });
          } catch { /* ignore duplicate */ }
        }
      }
    }

    const adjTotal = adjustments.filter(a => a.type !== 'JUNE_CAP').reduce((s, a) => s + a.days, 0);
    const capTotal = adjustments.filter(a => a.type === 'JUNE_CAP').reduce((s, a) => s + a.days, 0);

    return {
      hasBalance: true,
      initialDays: lb.initialDays,
      initialDate: lb.initialDate.toISOString().split('T')[0],
      accrued: totalAccrued,
      usedAnnual,
      usedSick,
      usedUnpaid,
      adjustmentsTotal: adjTotal + capTotal,
      balance: Math.round(balance * 10) / 10,
      pendingAnnualDays,
    };
  }

  /** Get balance (with lazy June-cap creation using a system admin) */
  async getBalance(userId: string): Promise<BalanceResult> {
    return this.computeBalance(userId, userId);
  }

  /** List leave requests — all users if all=true, otherwise for userId */
  async listRequests(userId: string, all = false) {
    const where = all ? {} : { userId };
    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, userCode: true, office: { select: { name: true } } } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** List pending requests (admin) */
  async listPendingRequests() {
    return this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, fullName: true, userCode: true, office: { select: { name: true } } } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Create a leave request */
  async createRequest(userId: string, dto: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) throw new BadRequestException('Data e mbarimit duhet të jetë pas datës së fillimit');
    if (!isWorkingDay(start)) throw new BadRequestException('Data e fillimit duhet të jetë ditë pune');
    if (!isWorkingDay(end)) throw new BadRequestException('Data e mbarimit duhet të jetë ditë pune');

    const workingDays = countWorkingDays(start, end);
    if (workingDays === 0) throw new BadRequestException('Nuk ka ditë pune në intervalin e zgjedhur');

    // Check annual leave balance
    if (dto.leaveType === 'ANNUAL') {
      const bal = await this.getBalance(userId);
      if (!bal.hasBalance) throw new BadRequestException('Bilanci i pushimeve nuk është konfiguruar. Kontaktoni administratorin.');
      if (bal.balance - bal.pendingAnnualDays < workingDays) {
        throw new BadRequestException(`Nuk keni ditë të mjaftueshme pushimi. Bilanci: ${bal.balance - bal.pendingAnnualDays} ditë`);
      }
    }

    // Check for overlapping requests
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    });
    if (overlap) throw new BadRequestException('Keni tashmë një kërkesë pushimi në këtë periudhë');

    const request = await this.prisma.leaveRequest.create({
      data: {
        userId,
        leaveType: dto.leaveType,
        startDate: start,
        endDate: end,
        workingDays,
        reason: dto.reason,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    // Notify all admins/managers about the new leave request
    const typeLabels: Record<string, string> = { ANNUAL: 'Pushim Vjetor', SICK: 'Pushim i Sëmurë', UNPAID: 'Pushim pa Pagë' };
    const admins = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['ADMIN', 'MANAGER'] }, id: { not: userId } },
      select: { id: true },
    });
    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map(a => ({
          userId: a.id,
          title: `${request.user.fullName} kërkoi ${typeLabels[dto.leaveType] ?? dto.leaveType}`,
          body: `${workingDays} ditë pune · ${start.toLocaleDateString('sq-AL')} – ${end.toLocaleDateString('sq-AL')}`,
          link: '/leave/admin',
        })),
      });
    }

    return request;
  }

  /** Cancel own request */
  async cancelRequest(requestId: string, userId: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Kërkesa nuk u gjet');
    if (req.userId !== userId) throw new ForbiddenException('Nuk keni leje');
    if (req.status !== 'PENDING') throw new BadRequestException('Vetëm kërkesat në pritje mund të anulohen');
    return this.prisma.leaveRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED' } });
  }

  /** Admin: approve or reject a request */
  async reviewRequest(requestId: string, adminId: string, approved: boolean, note?: string) {
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { fullName: true } } },
    });
    if (!req) throw new NotFoundException('Kërkesa nuk u gjet');
    if (req.status !== 'PENDING') throw new BadRequestException('Kërkesa nuk është në pritje');

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });

    // Create notification for the employee
    const typeLabels: Record<string, string> = { ANNUAL: 'Pushim Vjetor', SICK: 'Pushim i Sëmurë', UNPAID: 'Pushim pa Pagë' };
    const typeLabel = typeLabels[req.leaveType] || req.leaveType;
    const statusLabel = approved ? 'aprovuar' : 'refuzuar';
    await this.prisma.notification.create({
      data: {
        userId: req.userId,
        title: `Kërkesa për ${typeLabel} u ${statusLabel}`,
        body: note ? `Shënim: ${note}` : undefined,
        link: '/leave',
      },
    });

    return updated;
  }

  /** Admin: set initial balance for an employee */
  async setBalance(adminId: string, userId: string, initialDays: number, initialDate: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Përdoruesi nuk u gjet');

    const date = new Date(initialDate);
    if (isNaN(date.getTime())) throw new BadRequestException('Data e pavlefshme');

    const result = await this.prisma.leaveBalance.upsert({
      where: { userId },
      create: { userId, initialDays, initialDate: date, createdById: adminId },
      update: { initialDays, initialDate: date },
    });

    if (userId !== adminId) {
      await this.prisma.notification.create({
        data: {
          userId,
          title: 'Bilanci i pushimeve u konfigurua',
          body: `${initialDays} ditë fillestare nga ${date.toLocaleDateString('sq-AL')}`,
          link: '/leave',
        },
      });
    }

    return result;
  }

  /** Admin: create manual adjustment */
  async createAdjustment(adminId: string, userId: string, days: number, note: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Përdoruesi nuk u gjet');
    if (days === 0) throw new BadRequestException('Ditët nuk mund të jenë 0');

    const adj = await this.prisma.leaveAdjustment.create({
      data: {
        userId,
        days,
        type: 'MANUAL',
        note,
        date: new Date(),
        createdById: adminId,
      },
    });

    if (userId !== adminId) {
      const sign = days > 0 ? '+' : '';
      await this.prisma.notification.create({
        data: {
          userId,
          title: `Bilanci i pushimeve u rregullua (${sign}${days} ditë)`,
          body: note,
          link: '/leave',
        },
      });
    }

    return adj;
  }

  /** Admin: list all staff with their balances */
  async listStaffBalances() {
    const staff = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['OFFICER', 'MANAGER'] } },
      select: {
        id: true,
        fullName: true,
        userCode: true,
        role: true,
        office: { select: { name: true } },
        leaveBalance: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const results = await Promise.all(staff.map(async s => ({
      user: { id: s.id, fullName: s.fullName, userCode: s.userCode, role: s.role, office: s.office },
      balance: await this.computeBalance(s.id),
    })));

    return results;
  }

  /** Apply June cap for all users — called by cron on June 1 each year */
  async applyJuneCap(year: number) {
    const adminUser = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) return;

    const balances = await this.prisma.leaveBalance.findMany({ select: { userId: true } });
    for (const { userId } of balances) {
      await this.computeBalance(userId, adminUser.id);
    }
  }

  /** Get history of adjustments for a user */
  async listAdjustments(userId: string) {
    return this.prisma.leaveAdjustment.findMany({
      where: { userId },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { date: 'desc' },
    });
  }
}
