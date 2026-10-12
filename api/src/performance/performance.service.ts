import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async officerStats(query: { from?: string; to?: string; officeId?: string; officerId?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();

    const officerWhere: any = { isActive: true, role: { in: ['OFFICER', 'MANAGER'] as any[] } };
    if (query.officeId) officerWhere.officeId = query.officeId;
    // When scoped to a single officer, only show that officer
    if (query.officerId) officerWhere.id = query.officerId;

    const CALL_TYPES  = ['CALL', 'CALL_BORROWER', 'CALL_GUARANTOR'];
    const VISIT_TYPES = ['VISIT', 'FIELD_VISIT', 'VISIT_BORROWER', 'VISIT_GUARANTOR', 'MEETING_BORROWER', 'MEETING_GUARANTOR'];

    // 10 queries — all stats split by primary vs secondary role
    const [
      officers,
      primaryCaseCounts, secondaryCaseCounts,
      primaryPortfolioAgg, secondaryPortfolioAgg,
      primaryActivityAgg, secondaryActivityAgg,
      primaryPaymentAgg, secondaryPaymentAgg,
      primaryPromiseAgg, secondaryPromiseAgg,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: officerWhere,
        select: { id: true, fullName: true, role: true, office: { select: { name: true, code: true } } },
      }),
      // Primary active cases
      this.prisma.case.groupBy({
        by: ['assignedOfficerId'],
        where: { assignedOfficerId: { not: null }, status: 'ACTIVE' },
        _count: { id: true },
      }),
      // Secondary active cases
      this.prisma.case.groupBy({
        by: ['secondaryOfficerId'],
        where: { secondaryOfficerId: { not: null }, status: 'ACTIVE' },
        _count: { id: true },
      }),
      // Portfolio from primary assignments
      this.prisma.$queryRaw<{ officer_id: string; portfolio: string }[]>`
        SELECT c.assigned_officer_id AS officer_id,
               COALESCE(SUM(l.current_outstanding_balance), 0)::text AS portfolio
        FROM cases c JOIN loans l ON l.id = c.loan_id
        WHERE c.status = 'ACTIVE' AND c.assigned_officer_id IS NOT NULL
        GROUP BY c.assigned_officer_id
      `,
      // Portfolio from secondary assignments
      this.prisma.$queryRaw<{ officer_id: string; portfolio: string }[]>`
        SELECT c.secondary_officer_id AS officer_id,
               COALESCE(SUM(l.current_outstanding_balance), 0)::text AS portfolio
        FROM cases c JOIN loans l ON l.id = c.loan_id
        WHERE c.status = 'ACTIVE' AND c.secondary_officer_id IS NOT NULL
        GROUP BY c.secondary_officer_id
      `,
      // Activities logged by officer on their PRIMARY cases
      this.prisma.$queryRaw<{ officer_id: string; activity_type: string; cnt: string }[]>`
        SELECT a.officer_id, a.activity_type, COUNT(a.id)::text AS cnt
        FROM activities a
        JOIN cases c ON c.id = a.case_id AND c.assigned_officer_id = a.officer_id
        WHERE a.occurred_at >= ${from} AND a.occurred_at <= ${to}
        GROUP BY a.officer_id, a.activity_type
      `,
      // All activities on cases where officer is secondary
      this.prisma.$queryRaw<{ officer_id: string; activity_type: string; cnt: string }[]>`
        SELECT c.secondary_officer_id AS officer_id, a.activity_type, COUNT(a.id)::text AS cnt
        FROM activities a
        JOIN cases c ON c.id = a.case_id
        WHERE c.secondary_officer_id IS NOT NULL
          AND a.occurred_at >= ${from} AND a.occurred_at <= ${to}
        GROUP BY c.secondary_officer_id, a.activity_type
      `,
      // Payments recorded by officer on their PRIMARY cases
      this.prisma.$queryRaw<{ officer_id: string; cnt: string; total: string }[]>`
        SELECT p.officer_id, COUNT(p.id)::text AS cnt, COALESCE(SUM(p.amount), 0)::text AS total
        FROM payments p
        JOIN cases c ON c.id = p.case_id AND c.assigned_officer_id = p.officer_id
        WHERE p.payment_date >= ${from} AND p.payment_date <= ${to} AND p.voided_at IS NULL
        GROUP BY p.officer_id
      `,
      // All payments on cases where officer is secondary
      this.prisma.$queryRaw<{ officer_id: string; cnt: string; total: string }[]>`
        SELECT c.secondary_officer_id AS officer_id, COUNT(p.id)::text AS cnt, COALESCE(SUM(p.amount), 0)::text AS total
        FROM payments p
        JOIN cases c ON c.id = p.case_id
        WHERE c.secondary_officer_id IS NOT NULL
          AND p.payment_date >= ${from} AND p.payment_date <= ${to} AND p.voided_at IS NULL
        GROUP BY c.secondary_officer_id
      `,
      // Promises on PRIMARY cases (scoped to the case's primary officer)
      this.prisma.$queryRaw<{ officer_id: string; cnt: string; amount: string }[]>`
        SELECT c.assigned_officer_id AS officer_id,
               COUNT(a.id)::text AS cnt,
               COALESCE(SUM(a.promise_amount), 0)::text AS amount
        FROM activities a JOIN cases c ON c.id = a.case_id
        WHERE (a.activity_type = 'PROMISE_TO_PAY' OR a.outcome = 'PROMISE_RECEIVED')
          AND a.occurred_at >= ${from} AND a.occurred_at <= ${to}
          AND c.assigned_officer_id IS NOT NULL
        GROUP BY c.assigned_officer_id
      `,
      // Promises on SECONDARY cases (scoped to the case's secondary officer)
      this.prisma.$queryRaw<{ officer_id: string; cnt: string; amount: string }[]>`
        SELECT c.secondary_officer_id AS officer_id,
               COUNT(a.id)::text AS cnt,
               COALESCE(SUM(a.promise_amount), 0)::text AS amount
        FROM activities a JOIN cases c ON c.id = a.case_id
        WHERE (a.activity_type = 'PROMISE_TO_PAY' OR a.outcome = 'PROMISE_RECEIVED')
          AND a.occurred_at >= ${from} AND a.occurred_at <= ${to}
          AND c.secondary_officer_id IS NOT NULL
        GROUP BY c.secondary_officer_id
      `,
    ]);

    // Build lookup maps — filter null keys (nullable FK fields from groupBy)
    const primaryCaseMap  = new Map(primaryCaseCounts.filter((r) => r.assignedOfficerId != null).map((r) => [r.assignedOfficerId as string, r._count.id]));
    const secondaryCaseMap = new Map(secondaryCaseCounts.filter((r) => r.secondaryOfficerId != null).map((r) => [r.secondaryOfficerId as string, r._count.id]));
    const primaryPortMap  = new Map(primaryPortfolioAgg.map((r) => [r.officer_id, Number(r.portfolio)]));
    const secondaryPortMap = new Map(secondaryPortfolioAgg.map((r) => [r.officer_id, Number(r.portfolio)]));
    const primaryPayMap   = new Map(primaryPaymentAgg.map((r) => [r.officer_id, { count: Number(r.cnt), sum: Number(r.total) }]));
    const secondaryPayMap = new Map(secondaryPaymentAgg.map((r) => [r.officer_id, { count: Number(r.cnt), sum: Number(r.total) }]));
    const primaryPromMap  = new Map(primaryPromiseAgg.map((r) => [r.officer_id, { count: Number(r.cnt), amount: Number(r.amount) }]));
    const secondaryPromMap = new Map(secondaryPromiseAgg.map((r) => [r.officer_id, { count: Number(r.cnt), amount: Number(r.amount) }]));

    type ActMap = Map<string, { total: number; calls: number; visits: number }>;
    const buildActMap = (rows: { officer_id: string; activity_type: string; cnt: string }[]): ActMap => {
      const m: ActMap = new Map();
      for (const r of rows) {
        if (!m.has(r.officer_id)) m.set(r.officer_id, { total: 0, calls: 0, visits: 0 });
        const e = m.get(r.officer_id)!;
        e.total += Number(r.cnt);
        if (CALL_TYPES.includes(r.activity_type))  e.calls  += Number(r.cnt);
        if (VISIT_TYPES.includes(r.activity_type)) e.visits += Number(r.cnt);
      }
      return m;
    };
    const primaryActMap   = buildActMap(primaryActivityAgg);
    const secondaryActMap = buildActMap(secondaryActivityAgg);

    const makeStats = (
      actMap: ActMap,
      payMap: Map<string, { count: number; sum: number }>,
      promMap: Map<string, { count: number; amount: number }>,
      caseMap: Map<string, number>,
      portMap: Map<string, number>,
      oid: string,
    ) => {
      const act  = actMap.get(oid)  ?? { total: 0, calls: 0, visits: 0 };
      const pay  = payMap.get(oid)  ?? { count: 0, sum: 0 };
      const prom = promMap.get(oid) ?? { count: 0, amount: 0 };
      const cases = caseMap.get(oid) ?? 0;
      const port  = portMap.get(oid) ?? 0;
      return {
        activeCases: cases,
        portfolio: port,
        totalActivities: act.total, calls: act.calls, visits: act.visits,
        promises: prom.count, promiseAmount: prom.amount,
        collectedAmount: pay.sum, paymentCount: pay.count,
        collectionRate: prom.amount > 0 ? +((pay.sum / prom.amount) * 100).toFixed(1) : null,
      };
    };

    return officers.map((o) => ({
      id: o.id, fullName: o.fullName, role: o.role, office: o.office,
      primary:   makeStats(primaryActMap,   primaryPayMap,   primaryPromMap,   primaryCaseMap,   primaryPortMap,   o.id),
      secondary: makeStats(secondaryActMap, secondaryPayMap, secondaryPromMap, secondaryCaseMap, secondaryPortMap, o.id),
    }));
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

  async institutionStats(query: { from?: string; to?: string; institutionId?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();

    const instWhere: any = { isActive: true };
    if (query.institutionId) instWhere.id = query.institutionId;

    const [institutions, caseAgg, paymentAgg, activityAgg] = await Promise.all([
      this.prisma.institution.findMany({
        where: instWhere,
        select: { id: true, name: true, shortName: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.$queryRaw<{ institution_id: string; total: string; active: string; outstanding: string; original: string }[]>`
        SELECT
          l.institution_id,
          COUNT(l.id)::text AS total,
          COUNT(CASE WHEN c.status = 'ACTIVE' THEN 1 END)::text AS active,
          COALESCE(SUM(l.current_outstanding_balance), 0)::text AS outstanding,
          COALESCE(SUM(l.original_loan_amount), 0)::text AS original
        FROM loans l
        LEFT JOIN cases c ON c.loan_id = l.id
        GROUP BY l.institution_id
      `,
      this.prisma.$queryRaw<{ institution_id: string; total: string }[]>`
        SELECT l.institution_id, COALESCE(SUM(p.amount), 0)::text AS total
        FROM payments p
        JOIN cases c ON c.id = p.case_id
        JOIN loans l ON l.id = c.loan_id
        WHERE p.payment_date >= ${from} AND p.payment_date <= ${to}
          AND p.voided_at IS NULL
        GROUP BY l.institution_id
      `,
      this.prisma.$queryRaw<{ institution_id: string; cnt: string }[]>`
        SELECT l.institution_id, COUNT(a.id)::text AS cnt
        FROM activities a
        JOIN cases c ON c.id = a.case_id
        JOIN loans l ON l.id = c.loan_id
        WHERE a.occurred_at >= ${from} AND a.occurred_at <= ${to}
        GROUP BY l.institution_id
      `,
    ]);

    const totalMap    = new Map(caseAgg.map((r) => [r.institution_id, Number(r.total)]));
    const activeMap   = new Map(caseAgg.map((r) => [r.institution_id, Number(r.active)]));
    const outstandMap = new Map(caseAgg.map((r) => [r.institution_id, { outstanding: Number(r.outstanding), original: Number(r.original) }]));
    const payMap      = new Map(paymentAgg.map((r) => [r.institution_id, Number(r.total)]));
    const actMap      = new Map(activityAgg.map((r) => [r.institution_id, Number(r.cnt)]));

    return institutions.map((inst) => ({
      id: inst.id, name: inst.name, shortName: inst.shortName,
      totalCases: totalMap.get(inst.id) ?? 0,
      activeCases: activeMap.get(inst.id) ?? 0,
      collected: payMap.get(inst.id) ?? 0,
      activities: actMap.get(inst.id) ?? 0,
      totalOutstanding: outstandMap.get(inst.id)?.outstanding ?? 0,
      totalOriginal: outstandMap.get(inst.id)?.original ?? 0,
    }));
  }
}
