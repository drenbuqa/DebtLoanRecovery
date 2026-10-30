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

    // Resolve visible case IDs for officer or office scope
    let allowedCaseIds: Set<string> | null = null;
    if (query.officerId) {
      const scopedCases = await this.prisma.case.findMany({
        where: { OR: [{ assignedOfficerId: query.officerId }, { secondaryOfficerId: query.officerId }] },
        select: { id: true },
      });
      allowedCaseIds = new Set(scopedCases.map((c) => c.id));
    } else if (query.officeId) {
      const officeOfficers = await this.prisma.user.findMany({
        where: { officeId: query.officeId },
        select: { id: true },
      });
      const officerIds = officeOfficers.map((u) => u.id);
      const scopedCases = await this.prisma.case.findMany({
        where: officerIds.length > 0
          ? { OR: [{ officeId: query.officeId }, { assignedOfficerId: { in: officerIds } }, { secondaryOfficerId: { in: officerIds } }] }
          : { officeId: query.officeId },
        select: { id: true },
      });
      allowedCaseIds = new Set(scopedCases.map((c) => c.id));
    }

    // 1. Institutions with all loans
    const institutions = await this.prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, shortName: true,
        loans: {
          select: {
            originalLoanAmount: true,
            currentOutstandingBalance: true,
            case: { select: { id: true, status: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build a map: institutionId → Set<caseId> (filtered when scoped to an office)
    const instCaseIds = new Map<string, Set<string>>();
    for (const inst of institutions) {
      const ids = new Set<string>();
      for (const loan of inst.loans) {
        if (loan.case?.id && (allowedCaseIds === null || allowedCaseIds.has(loan.case.id))) {
          ids.add(loan.case.id);
        }
      }
      instCaseIds.set(inst.id, ids);
    }
    const allCaseIds = [...new Set([...instCaseIds.values()].flatMap((s) => [...s]))];

    if (allCaseIds.length === 0) {
      return institutions.map((inst) => ({
        id: inst.id, name: inst.name, shortName: inst.shortName,
        totalLoans: 0, totalCases: 0, activeCases: 0,
        totalOutstanding: 0, totalOriginal: 0,
        periodPaymentsValue: 0, periodPaymentsCount: 0,
        periodPromisesValue: 0, periodPromisesCount: 0,
        periodCalls: 0, periodVisits: 0, periodLegal: 0, periodOther: 0,
        legalProceedingsCount: 0,
      }));
    }

    // 2. Batch: payments in period
    const periodPayments = await this.prisma.payment.findMany({
      where: { caseId: { in: allCaseIds }, paymentDate: { gte: from, lte: to }, voidedAt: null },
      select: { caseId: true, amount: true },
    });

    // 3. Batch: activities in period
    const periodActivities = await this.prisma.activity.findMany({
      where: { caseId: { in: allCaseIds }, occurredAt: { gte: from, lte: to } },
      select: { caseId: true, activityType: true, promiseAmount: true, outcome: true },
    });

    // 3b. Batch: agreement installments due in period (count as promises)
    const periodInstallments = await this.prisma.agreementInstallment.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        status: { in: ['PENDING', 'OVERDUE'] },
        agreement: { status: 'ACTIVE', caseId: { in: allCaseIds } },
      },
      select: { amount: true, agreement: { select: { caseId: true } } },
    });

    // 3c. Batch: active legal proceedings (not CLOSED) per case
    const legalProceedings = await this.prisma.legalProceeding.findMany({
      where: { caseId: { in: allCaseIds }, status: { not: 'CLOSED' as any } },
      select: { caseId: true },
    });

    // 4. Aggregate per institution
    return institutions.map((inst) => {
      const caseIds = instCaseIds.get(inst.id) ?? new Set<string>();
      const scopedLoans = allowedCaseIds
        ? inst.loans.filter((l) => l.case?.id && allowedCaseIds!.has(l.case.id))
        : inst.loans;
      const activeCases   = scopedLoans.filter((l) => l.case?.status === 'ACTIVE').length;
      const totalOutstanding = scopedLoans.reduce((s, l) => s + Number(l.currentOutstandingBalance), 0);
      const totalOriginal    = scopedLoans.reduce((s, l) => s + Number(l.originalLoanAmount ?? 0), 0);

      const pyms = periodPayments.filter((p) => caseIds.has(p.caseId));
      const acts = periodActivities.filter((a) => caseIds.has(a.caseId));
      const actPromises = acts.filter((a) => a.activityType === 'PROMISE_TO_PAY' || a.outcome === 'PROMISE_RECEIVED');
      const instmntPromises = periodInstallments.filter((i) => caseIds.has(i.agreement.caseId));
      const promises = [...actPromises.map((a) => ({ amount: a.promiseAmount })), ...instmntPromises];

      return {
        id: inst.id, name: inst.name, shortName: inst.shortName,
        totalLoans: scopedLoans.length,
        totalCases: caseIds.size,
        activeCases,
        totalOutstanding,
        totalOriginal,
        periodPaymentsValue: pyms.reduce((s, p) => s + Number(p.amount), 0),
        periodPaymentsCount: pyms.length,
        periodPromisesValue: promises.reduce((s, a) => s + Number(a.amount ?? 0), 0),
        periodPromisesCount: promises.length,
        periodCalls:  acts.filter((a) => CALL_TYPES.includes(a.activityType)).length,
        periodVisits: acts.filter((a) => VISIT_TYPES.includes(a.activityType)).length,
        periodLegal:  acts.filter((a) => LEGAL_TYPES.includes(a.activityType)).length,
        periodOther:  acts.filter((a) => !SKIP_TYPES.includes(a.activityType)).length,
        legalProceedingsCount: legalProceedings.filter((lp) => caseIds.has(lp.caseId)).length,
      };
    });
  }
}
