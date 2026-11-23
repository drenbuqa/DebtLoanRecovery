import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

  async officerList(query: { officeId?: string }) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const officerWhere: any = { isActive: true, role: { in: ['OFFICER', 'MANAGER'] as any[] } };
    if (query.officeId) officerWhere.officeId = query.officeId;

    const [
      officers,
      activeCaseCounts,
      portfolioRows,
      promisePendingCounts,
      promiseOverdueCounts,
      activityMonthCounts,
      lastActivityRows,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: officerWhere,
        select: { id: true, fullName: true, role: true, userCode: true, office: { select: { name: true, code: true } } },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.case.groupBy({
        by: ['assignedOfficerId'],
        where: { assignedOfficerId: { not: null }, status: 'ACTIVE' },
        _count: { id: true },
      }),
      this.prisma.$queryRaw<{ officer_id: string; portfolio: string }[]>`
        SELECT c.assigned_officer_id AS officer_id,
               COALESCE(SUM(l.current_outstanding_balance), 0)::text AS portfolio
        FROM cases c JOIN loans l ON l.id = c.loan_id
        WHERE c.status = 'ACTIVE' AND c.assigned_officer_id IS NOT NULL
        GROUP BY c.assigned_officer_id
      `,
      this.prisma.$queryRaw<{ officer_id: string; cnt: string }[]>`
        SELECT c.assigned_officer_id AS officer_id, COUNT(p.id)::text AS cnt
        FROM cases c JOIN promise_to_pay p ON p.case_id = c.id
        WHERE c.assigned_officer_id IS NOT NULL AND p.status = 'PENDING'
        GROUP BY c.assigned_officer_id
      `,
      this.prisma.$queryRaw<{ officer_id: string; cnt: string }[]>`
        SELECT c.assigned_officer_id AS officer_id, COUNT(p.id)::text AS cnt
        FROM cases c JOIN promise_to_pay p ON p.case_id = c.id
        WHERE c.assigned_officer_id IS NOT NULL AND p.status = 'PENDING' AND p.promise_date < NOW()
        GROUP BY c.assigned_officer_id
      `,
      this.prisma.$queryRaw<{ officer_id: string; cnt: string }[]>`
        SELECT c.assigned_officer_id AS officer_id, COUNT(a.id)::text AS cnt
        FROM cases c JOIN activities a ON a.case_id = c.id
        WHERE c.assigned_officer_id IS NOT NULL AND a.occurred_at >= ${monthStart} AND a.deleted_at IS NULL
        GROUP BY c.assigned_officer_id
      `,
      this.prisma.$queryRaw<{ officer_id: string; last_at: Date }[]>`
        SELECT c.assigned_officer_id AS officer_id, MAX(a.occurred_at) AS last_at
        FROM cases c JOIN activities a ON a.case_id = c.id
        WHERE c.assigned_officer_id IS NOT NULL AND a.deleted_at IS NULL
        GROUP BY c.assigned_officer_id
      `,
    ]);

    const caseMap   = new Map(activeCaseCounts.map(r => [r.assignedOfficerId!, r._count.id]));
    const portMap   = new Map(portfolioRows.map(r => [r.officer_id, Number(r.portfolio)]));
    const ppMap     = new Map(promisePendingCounts.map(r => [r.officer_id, Number(r.cnt)]));
    const poMap     = new Map(promiseOverdueCounts.map(r => [r.officer_id, Number(r.cnt)]));
    const actMap    = new Map(activityMonthCounts.map(r => [r.officer_id, Number(r.cnt)]));
    const lastActMap = new Map(lastActivityRows.map(r => [r.officer_id, r.last_at]));

    return officers.map(o => ({
      id: o.id,
      fullName: o.fullName,
      role: o.role,
      userCode: o.userCode,
      office: o.office,
      activeCases: caseMap.get(o.id) ?? 0,
      portfolioBalance: portMap.get(o.id) ?? 0,
      promisesPending: ppMap.get(o.id) ?? 0,
      promisesOverdue: poMap.get(o.id) ?? 0,
      activitiesThisMonth: actMap.get(o.id) ?? 0,
      lastActivityAt: lastActMap.get(o.id) ?? null,
    }));
  }

  async officerDetail(officerId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      officer,
      cases,
      promises,
      recentActivities,
      activityCountsThisMonth,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: officerId },
        select: { id: true, fullName: true, role: true, userCode: true, office: { select: { name: true, code: true } } },
      }),
      this.prisma.case.findMany({
        where: { assignedOfficerId: officerId, archivedAt: null },
        select: {
          id: true, caseReference: true, status: true, collectionStage: true, collectionStatus: true,
          nextActionDate: true, nextActionNote: true, registrationDate: true,
          loan: { select: { currentOutstandingBalance: true, lastPaymentDate: true,
            borrower: { select: { fullName: true } },
            institution: { select: { shortName: true } } } },
        },
        orderBy: { loan: { currentOutstandingBalance: 'desc' } },
        take: 500,
      }),
      this.prisma.promiseToPay.findMany({
        where: { case: { assignedOfficerId: officerId } },
        select: {
          id: true, promisedAmount: true, currency: true, promiseDate: true,
          status: true, notes: true, createdAt: true,
          case: { select: { id: true, caseReference: true, loan: { select: { borrower: { select: { fullName: true } } } } } },
        },
        orderBy: { promiseDate: 'desc' },
        take: 100,
      }),
      this.prisma.activity.findMany({
        where: { case: { assignedOfficerId: officerId }, deletedAt: null },
        select: {
          id: true, activityType: true, channel: true, outcome: true,
          notes: true, occurredAt: true, promiseAmount: true, nextActionDate: true,
          case: { select: { id: true, caseReference: true, loan: { select: { borrower: { select: { fullName: true } } } } } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      this.prisma.activity.count({ where: { case: { assignedOfficerId: officerId }, occurredAt: { gte: monthStart }, deletedAt: null } }),
    ]);

    const totalBalance = cases.reduce((s, c) => s + Number(c.loan?.currentOutstandingBalance ?? 0), 0);
    const promisesOverdue = promises.filter(p => p.status === 'PENDING' && new Date(p.promiseDate) < now).length;

    return {
      officer,
      stats: {
        activeCases: cases.filter(c => c.status === 'ACTIVE').length,
        totalCases: cases.length,
        totalBalance,
        promisesPending: promises.filter(p => p.status === 'PENDING').length,
        promisesKept: promises.filter(p => p.status === 'KEPT').length,
        promisesOverdue,
        activitiesThisMonth: activityCountsThisMonth,
      },
      cases,
      promises,
      recentActivities,
    };
  }
}
