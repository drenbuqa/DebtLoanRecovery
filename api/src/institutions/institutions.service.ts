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
            id: true, loanNumber: true, currentOutstandingBalance: true, daysPastDue: true,
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

  async stats() {
    const now   = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Institutions with all loans (for portfolio / outstanding balance)
    const institutions = await this.prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, shortName: true,
        loans: {
          select: {
            currentOutstandingBalance: true,
            case: { select: { id: true, status: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build a map: institutionId → Set<caseId>
    const instCaseIds = new Map<string, Set<string>>();
    for (const inst of institutions) {
      const ids = new Set<string>();
      for (const loan of inst.loans) {
        if (loan.case?.id) ids.add(loan.case.id);
      }
      instCaseIds.set(inst.id, ids);
    }
    const allCaseIds = [...new Set([...instCaseIds.values()].flatMap((s) => [...s]))];

    if (allCaseIds.length === 0) {
      return institutions.map((inst) => ({
        id: inst.id, name: inst.name, shortName: inst.shortName,
        totalLoans: 0, totalCases: 0, activeCases: 0, totalOutstanding: 0,
        monthPaymentsValue: 0, monthPaymentsCount: 0,
        monthPromisesValue: 0, monthPromisesCount: 0,
        monthCalls: 0, monthVisits: 0, monthLegal: 0, monthOther: 0,
      }));
    }

    // 2. Batch: payments this month
    const monthPayments = await this.prisma.payment.findMany({
      where: { caseId: { in: allCaseIds }, paymentDate: { gte: monthStart, lte: now }, voidedAt: null },
      select: { caseId: true, amount: true },
    });

    // 3. Batch: activities this month
    const monthActivities = await this.prisma.activity.findMany({
      where: { caseId: { in: allCaseIds }, occurredAt: { gte: monthStart, lte: now } },
      select: { caseId: true, activityType: true, promiseAmount: true },
    });

    // 4. Aggregate per institution
    return institutions.map((inst) => {
      const caseIds = instCaseIds.get(inst.id) ?? new Set<string>();
      const activeCases = inst.loans.filter((l) => l.case?.status === 'ACTIVE').length;
      const totalOutstanding = inst.loans.reduce((s, l) => s + Number(l.currentOutstandingBalance), 0);

      const pyms = monthPayments.filter((p) => caseIds.has(p.caseId));
      const acts = monthActivities.filter((a) => caseIds.has(a.caseId));

      const promises = acts.filter((a) => a.activityType === 'PROMISE_TO_PAY');

      return {
        id: inst.id, name: inst.name, shortName: inst.shortName,
        totalLoans: inst.loans.length,
        totalCases: caseIds.size,
        activeCases,
        totalOutstanding,
        monthPaymentsValue: pyms.reduce((s, p) => s + Number(p.amount), 0),
        monthPaymentsCount: pyms.length,
        monthPromisesValue: promises.reduce((s, a) => s + Number(a.promiseAmount ?? 0), 0),
        monthPromisesCount: promises.length,
        monthCalls:  acts.filter((a) => CALL_TYPES.includes(a.activityType)).length,
        monthVisits: acts.filter((a) => VISIT_TYPES.includes(a.activityType)).length,
        monthLegal:  acts.filter((a) => LEGAL_TYPES.includes(a.activityType)).length,
        monthOther:  acts.filter((a) => !SKIP_TYPES.includes(a.activityType)).length,
      };
    });
  }
}
