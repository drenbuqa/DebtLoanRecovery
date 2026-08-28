import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async officerStats(query: { from?: string; to?: string; officeId?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();

    const officers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['OFFICER', 'MANAGER'] },
        ...(query.officeId ? { officeId: query.officeId } : {}),
      },
      select: {
        id: true, fullName: true, role: true,
        office: { select: { name: true, code: true } },
        cases: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
        activities: {
          where: { occurredAt: { gte: from, lte: to } },
          select: { activityType: true, promiseAmount: true },
        },
        payments: {
          where: { paymentDate: { gte: from, lte: to } },
          select: { amount: true },
        },
      },
    });

    return officers.map((o) => {
      const activeCases = o.cases.length;
      const totalActivities = o.activities.length;
      const calls = o.activities.filter((a) => a.activityType === 'CALL').length;
      const visits = o.activities.filter((a) => ['VISIT', 'FIELD_VISIT'].includes(a.activityType)).length;
      const promises = o.activities.filter((a) => a.activityType === 'PROMISE_TO_PAY').length;
      const promiseAmount = o.activities
        .filter((a) => a.activityType === 'PROMISE_TO_PAY' && a.promiseAmount)
        .reduce((s, a) => s + Number(a.promiseAmount), 0);
      const collectedAmount = o.payments.reduce((s, p) => s + Number(p.amount), 0);
      const paymentCount = o.payments.length;

      return {
        id: o.id,
        fullName: o.fullName,
        role: o.role,
        office: o.office,
        activeCases,
        totalActivities,
        calls,
        visits,
        promises,
        promiseAmount,
        collectedAmount,
        paymentCount,
        activitiesPerCase: activeCases > 0 ? +(totalActivities / activeCases).toFixed(1) : 0,
        collectionRate: promiseAmount > 0 ? +((collectedAmount / promiseAmount) * 100).toFixed(1) : null,
      };
    });
  }

  async officeStats(query: { from?: string; to?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();

    const offices = await this.prisma.office.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, code: true,
        cases: {
          select: {
            status: true,
            payments: {
              where: { paymentDate: { gte: from, lte: to } },
              select: { amount: true },
            },
            activities: {
              where: { occurredAt: { gte: from, lte: to } },
              select: { activityType: true },
            },
          },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    return offices.map((o) => {
      const activeCases = o.cases.filter((c) => c.status === 'ACTIVE').length;
      const totalCases = o.cases.length;
      const collected = o.cases.flatMap((c) => c.payments).reduce((s, p) => s + Number(p.amount), 0);
      const activities = o.cases.flatMap((c) => c.activities).length;
      return {
        id: o.id, name: o.name, code: o.code,
        activeCases, totalCases,
        officerCount: o._count.users,
        collected, activities,
      };
    });
  }
}
