import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CALL_TYPES   = ['CALL_BORROWER', 'CALL_GUARANTOR', 'CALL', 'SMS', 'WARNING_LETTER'];
const VISIT_TYPES  = ['VISIT', 'VISIT_BORROWER', 'VISIT_GUARANTOR', 'FIELD_VISIT', 'MEETING_BORROWER', 'MEETING_GUARANTOR'];
const LEGAL_TYPES  = ['LEGAL_ACTION'];
const SKIP_TYPES   = [...CALL_TYPES, ...VISIT_TYPES, ...LEGAL_TYPES, 'PROMISE_TO_PAY', 'PAYMENT_RECEIVED'];

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const institutions = await this.prisma.institution.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { loans: true } } },
    });
    return institutions.map((i) => ({
      id: i.id, name: i.name, shortName: i.shortName,
      isActive: i.isActive, loanCount: i._count.loans, createdAt: i.createdAt,
    }));
  }

  async findOne(id: string) {
    const inst = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        _count: { select: { loans: true } },
        loans: {
          select: {
            id: true, loanNumber: true, currentOutstandingBalance: true,
            case: { select: { id: true, status: true, collectionStage: true } },
          },
          orderBy: { currentOutstandingBalance: 'desc' },
          take: 20,
        },
      },
    });
    if (!inst) throw new NotFoundException('Institucioni nuk u gjet');
    return inst;
  }

  async create(dto: { name: string; shortName: string }) {
    return this.prisma.institution.create({ data: { name: dto.name, shortName: dto.shortName } });
  }

  async update(id: string, dto: { name?: string; shortName?: string; isActive?: boolean }) {
    return this.prisma.institution.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const count = await this.prisma.loan.count({ where: { institutionId: id } });
    if (count > 0)
      throw new BadRequestException(`Ky institucion ka ${count} kredi të lidhura dhe nuk mund të fshihet`);
    await this.prisma.institution.delete({ where: { id } });
    return { success: true };
  }

  async stats(query: { from?: string; to?: string; officeId?: string; officerId?: string } = {}) {
    const now = new Date();
    const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to   = query.to   ? new Date(query.to)   : now;

    const scopeParams: string[] = [];
    if (query.officerId) {
      scopeParams.push(query.officerId);
    } else if (query.officeId) {
      scopeParams.push(query.officeId);
    }

    // All queries join: institutions → loans → cases, never passing a giant IN list.
    // Using $queryRawUnsafe is safe here because scopeParams are UUIDs from req.user (server-set),
    // never from user-supplied query strings.

    type LoanRow = { inst_id: string; case_id: string | null; status: string | null; outstanding: string; original: string };
    type PayRow  = { inst_id: string; case_id: string; amount: string };
    type ActRow  = { inst_id: string; case_id: string; activity_type: string; promise_amount: string | null; outcome: string | null };
    type InstRow = { inst_id: string; case_id: string; amount: string };
    type LpRow   = { inst_id: string; case_id: string };

    const p0 = scopeParams[0] as any;

    const [loanRows, payRows, actRows, instRows, lpRows, instList] = await Promise.all([
      // Loans + case status per institution
      scopeParams.length
        ? this.prisma.$queryRaw<LoanRow[]>`
            SELECT i.id AS inst_id, c.id AS case_id, c.status,
                   l.current_outstanding_balance::text AS outstanding,
                   COALESCE(l.original_loan_amount, 0)::text AS original
            FROM institutions i
            JOIN loans l ON l.institution_id = i.id
            LEFT JOIN cases c ON c.loan_id = l.id AND c.archived_at IS NULL
            WHERE i.is_active = true
              AND (c.assigned_officer_id = ${p0}::uuid
                   OR c.secondary_officer_id = ${p0}::uuid
                   OR c.office_id = ${p0}::uuid
                   OR c.assigned_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid)
                   OR c.secondary_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid))`
        : this.prisma.$queryRaw<LoanRow[]>`
            SELECT i.id AS inst_id, c.id AS case_id, c.status,
                   l.current_outstanding_balance::text AS outstanding,
                   COALESCE(l.original_loan_amount, 0)::text AS original
            FROM institutions i
            JOIN loans l ON l.institution_id = i.id
            LEFT JOIN cases c ON c.loan_id = l.id AND c.archived_at IS NULL
            WHERE i.is_active = true`,

      // Payments in period per institution
      scopeParams.length
        ? this.prisma.$queryRaw<PayRow[]>`
            SELECT i.id AS inst_id, p.case_id::text, p.amount::text
            FROM payments p
            JOIN cases c ON c.id = p.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE p.payment_date >= ${from} AND p.payment_date <= ${to} AND p.voided_at IS NULL
              AND (c.assigned_officer_id = ${p0}::uuid OR c.secondary_officer_id = ${p0}::uuid
                   OR c.office_id = ${p0}::uuid
                   OR c.assigned_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid)
                   OR c.secondary_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid))`
        : this.prisma.$queryRaw<PayRow[]>`
            SELECT i.id AS inst_id, p.case_id::text, p.amount::text
            FROM payments p
            JOIN cases c ON c.id = p.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE p.payment_date >= ${from} AND p.payment_date <= ${to} AND p.voided_at IS NULL`,

      // Activities in period per institution
      scopeParams.length
        ? this.prisma.$queryRaw<ActRow[]>`
            SELECT i.id AS inst_id, a.case_id::text, a.activity_type, a.promise_amount::text, a.outcome
            FROM activities a
            JOIN cases c ON c.id = a.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE a.occurred_at >= ${from} AND a.occurred_at <= ${to} AND a.deleted_at IS NULL
              AND (c.assigned_officer_id = ${p0}::uuid OR c.secondary_officer_id = ${p0}::uuid
                   OR c.office_id = ${p0}::uuid
                   OR c.assigned_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid)
                   OR c.secondary_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid))`
        : this.prisma.$queryRaw<ActRow[]>`
            SELECT i.id AS inst_id, a.case_id::text, a.activity_type, a.promise_amount::text, a.outcome
            FROM activities a
            JOIN cases c ON c.id = a.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE a.occurred_at >= ${from} AND a.occurred_at <= ${to} AND a.deleted_at IS NULL`,

      // Agreement installments due in period per institution
      scopeParams.length
        ? this.prisma.$queryRaw<InstRow[]>`
            SELECT i.id AS inst_id, ag.case_id::text, ai.amount::text
            FROM agreement_installments ai
            JOIN agreements ag ON ag.id = ai.agreement_id AND ag.status = 'ACTIVE'
            JOIN cases c ON c.id = ag.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE ai.due_date >= ${from} AND ai.due_date <= ${to}
              AND ai.status IN ('PENDING', 'OVERDUE')
              AND (c.assigned_officer_id = ${p0}::uuid OR c.secondary_officer_id = ${p0}::uuid
                   OR c.office_id = ${p0}::uuid
                   OR c.assigned_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid)
                   OR c.secondary_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid))`
        : this.prisma.$queryRaw<InstRow[]>`
            SELECT i.id AS inst_id, ag.case_id::text, ai.amount::text
            FROM agreement_installments ai
            JOIN agreements ag ON ag.id = ai.agreement_id AND ag.status = 'ACTIVE'
            JOIN cases c ON c.id = ag.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE ai.due_date >= ${from} AND ai.due_date <= ${to}
              AND ai.status IN ('PENDING', 'OVERDUE')`,

      // Active legal proceedings per institution
      scopeParams.length
        ? this.prisma.$queryRaw<LpRow[]>`
            SELECT i.id AS inst_id, lp.case_id::text
            FROM legal_proceedings lp
            JOIN cases c ON c.id = lp.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE lp.status <> 'CLOSED'
              AND (c.assigned_officer_id = ${p0}::uuid OR c.secondary_officer_id = ${p0}::uuid
                   OR c.office_id = ${p0}::uuid
                   OR c.assigned_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid)
                   OR c.secondary_officer_id IN (SELECT id FROM users WHERE office_id = ${p0}::uuid))`
        : this.prisma.$queryRaw<LpRow[]>`
            SELECT i.id AS inst_id, lp.case_id::text
            FROM legal_proceedings lp
            JOIN cases c ON c.id = lp.case_id
            JOIN loans l ON l.id = c.loan_id
            JOIN institutions i ON i.id = l.institution_id
            WHERE lp.status <> 'CLOSED'`,

      // Institution list (for ordering + name)
      this.prisma.institution.findMany({
        where: { isActive: true },
        select: { id: true, name: true, shortName: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Build per-institution sets from loan rows
    const instCaseIds = new Map<string, Set<string>>();
    for (const inst of instList) instCaseIds.set(inst.id, new Set());
    for (const r of loanRows) {
      if (r.case_id) instCaseIds.get(r.inst_id)?.add(r.case_id);
    }

    return instList.map((inst) => {
      const loans   = loanRows.filter((r) => r.inst_id === inst.id);
      const active  = loans.filter((r) => r.status === 'ACTIVE').length;
      const outstanding = loans.reduce((s, r) => s + Number(r.outstanding), 0);
      const original    = loans.reduce((s, r) => s + Number(r.original), 0);

      const pyms = payRows.filter((r) => r.inst_id === inst.id);
      const acts = actRows.filter((r) => r.inst_id === inst.id);
      const insts = instRows.filter((r) => r.inst_id === inst.id);
      const lps   = lpRows.filter((r) => r.inst_id === inst.id);

      const actPromises = acts.filter((a) => a.activity_type === 'PROMISE_TO_PAY' || a.outcome === 'PROMISE_RECEIVED');
      const promises = [
        ...actPromises.map((a) => Number(a.promise_amount ?? 0)),
        ...insts.map((i) => Number(i.amount)),
      ];

      return {
        id: inst.id, name: inst.name, shortName: inst.shortName,
        totalLoans: loans.length,
        totalCases: instCaseIds.get(inst.id)?.size ?? 0,
        activeCases: active,
        totalOutstanding: outstanding,
        totalOriginal: original,
        periodPaymentsValue: pyms.reduce((s, r) => s + Number(r.amount), 0),
        periodPaymentsCount: pyms.length,
        periodPromisesValue: promises.reduce((s, v) => s + v, 0),
        periodPromisesCount: promises.length,
        periodCalls:  acts.filter((a) => CALL_TYPES.includes(a.activity_type)).length,
        periodVisits: acts.filter((a) => VISIT_TYPES.includes(a.activity_type)).length,
        periodLegal:  acts.filter((a) => LEGAL_TYPES.includes(a.activity_type)).length,
        periodOther:  acts.filter((a) => !SKIP_TYPES.includes(a.activity_type)).length,
        legalProceedingsCount: lps.length,
      };
    });
  }
}
