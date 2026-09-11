import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async officerStats(query: { from?: string; to?: string; officeId?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();

    const officerWhere = { isActive: true, role: { in: ['OFFICER', 'MANAGER'] as any[] }, ...(query.officeId ? { officeId: query.officeId } : {}) };

    // 4 queries total regardless of officer count — no N+1
    const [officers, caseCounts, activityGroups, paymentGroups] = await Promise.all([
      this.prisma.user.findMany({
        where: officerWhere,
        select: { id: true, fullName: true, role: true, office: { select: { name: true, code: true } } },
      }),
      this.prisma.case.groupBy({
        by: ['assignedOfficerId'],
        where: { assignedOfficerId: { not: null }, status: 'ACTIVE' },
        _count: { id: true },
      }),
      this.prisma.activity.groupBy({
        by: ['officerId', 'activityType'],
        where: { officer: officerWhere, occurredAt: { gte: from, lte: to } },
        _count: { id: true },
        _sum: { promiseAmount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['officerId'],
        where: { officer: officerWhere, paymentDate: { gte: from, lte: to }, voidedAt: null },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Build lookup maps — O(n) instead of O(n²) scanning inside the map
    const caseCountMap = new Map(caseCounts.map((r) => [r.assignedOfficerId, r._count.id]));
    const paymentMap = new Map(paymentGroups.map((r) => [r.officerId, { count: r._count.id, sum: Number(r._sum.amount ?? 0) }]));

    const activityMap = new Map<string, { total: number; calls: number; visits: number; promises: number; promiseAmount: number }>();
    for (const r of activityGroups) {
      const oid = r.officerId;
      if (!activityMap.has(oid)) activityMap.set(oid, { total: 0, calls: 0, visits: 0, promises: 0, promiseAmount: 0 });
      const entry = activityMap.get(oid)!;
      entry.total += r._count.id;
      if (r.activityType === 'CALL') entry.calls += r._count.id;
      if (r.activityType === 'VISIT' || r.activityType === 'FIELD_VISIT') entry.visits += r._count.id;
      if (r.activityType === 'PROMISE_TO_PAY') {
        entry.promises += r._count.id;
        entry.promiseAmount += Number(r._sum.promiseAmount ?? 0);
      }
    }

    return officers.map((o) => {
      const activeCases = caseCountMap.get(o.id) ?? 0;
      const act = activityMap.get(o.id) ?? { total: 0, calls: 0, visits: 0, promises: 0, promiseAmount: 0 };
      const pay = paymentMap.get(o.id) ?? { count: 0, sum: 0 };
      return {
        id: o.id, fullName: o.fullName, role: o.role, office: o.office,
        activeCases,
        totalActivities: act.total, calls: act.calls, visits: act.visits,
        promises: act.promises, promiseAmount: act.promiseAmount,
        collectedAmount: pay.sum, paymentCount: pay.count,
        activitiesPerCase: activeCases > 0 ? +(act.total / activeCases).toFixed(1) : 0,
        collectionRate: act.promiseAmount > 0 ? +((pay.sum / act.promiseAmount) * 100).toFixed(1) : null,
      };
    });
  }

  async officeStats(query: { from?: string; to?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();

    // 5 queries total regardless of office/case count — no row hydration
    const [offices, totalCaseCounts, activeCaseCounts, paymentAgg, activityAgg] = await Promise.all([
      this.prisma.office.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, _count: { select: { users: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.case.groupBy({ by: ['officeId'], _count: { id: true } }),
      this.prisma.case.groupBy({ by: ['officeId'], where: { status: 'ACTIVE' }, _count: { id: true } }),
      // Prisma groupBy can't traverse relations (payment→case→officeId), so raw SQL for these two
      this.prisma.$queryRaw<{ office_id: string; total: string }[]>`
        SELECT c.office_id, COALESCE(SUM(p.amount), 0)::text AS total
        FROM payments p
        JOIN cases c ON c.id = p.case_id
        WHERE p.payment_date >= ${from} AND p.payment_date <= ${to}
          AND p.voided_at IS NULL
        GROUP BY c.office_id
      `,
      this.prisma.$queryRaw<{ office_id: string; cnt: string }[]>`
        SELECT c.office_id, COUNT(a.id)::text AS cnt
        FROM activities a
        JOIN cases c ON c.id = a.case_id
        WHERE a.occurred_at >= ${from} AND a.occurred_at <= ${to}
        GROUP BY c.office_id
      `,
    ]);

    const totalMap = new Map(totalCaseCounts.map((r) => [r.officeId, r._count.id]));
    const activeMap = new Map(activeCaseCounts.map((r) => [r.officeId, r._count.id]));
    const payMap = new Map(paymentAgg.map((r) => [r.office_id, Number(r.total)]));
    const actMap = new Map(activityAgg.map((r) => [r.office_id, Number(r.cnt)]));

    return offices.map((o) => ({
      id: o.id, name: o.name, code: o.code,
      totalCases: totalMap.get(o.id) ?? 0,
      activeCases: activeMap.get(o.id) ?? 0,
      officerCount: o._count.users,
      collected: payMap.get(o.id) ?? 0,
      activities: actMap.get(o.id) ?? 0,
    }));
  }
}
