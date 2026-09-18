import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CollectionStage, CaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CASE_LIST_SELECT = {
  id: true,
  caseReference: true,
  status: true,
  collectionStage: true,
  priorityScore: true,
  nextActionDate: true,
  createdAt: true,
  updatedAt: true,
  loan: {
    select: {
      id: true,
      loanNumber: true,
      currentOutstandingBalance: true,
      originalLoanAmount: true,
      currency: true,
      lastPaymentDate: true,
      daysPastDue: true,
      nplClassification: true,
      institution: { select: { id: true, shortName: true, name: true } },
      borrower: {
        select: {
          id: true, fullName: true, personalId: true,
          address: true, city: true,
          phones: {
            where: { isActive: true },
            orderBy: { isPrimary: 'desc' as const },
            take: 1,
            select: { phoneNumber: true },
          },
        },
      },
      relatedParties: {
        select: {
          role: true,
          person: { select: { id: true, fullName: true } },
        },
      },
    },
  },
  assignedOfficer: { select: { id: true, fullName: true } },
  secondaryOfficer: { select: { id: true, fullName: true } },
  office: { select: { id: true, name: true } },
  promises: {
    orderBy: { promiseDate: 'desc' as const },
    take: 1,
    select: { id: true, promiseDate: true, promisedAmount: true, status: true },
  },
  _count: { select: { activities: true, payments: true } },
};

const CASE_DETAIL_EXTRA = {
  nextActionNote: true,
  secondaryOfficer: { select: { id: true, fullName: true } },
  registrationDate: true,
  loan: {
    select: {
      id: true,
      loanNumber: true,
      currentOutstandingBalance: true,
      originalLoanAmount: true,
      disbursedAmount: true,
      currency: true,
      productType: true,
      interestRate: true,
      disbursementDate: true,
      maturityDate: true,
      lastPaymentDate: true,
      daysPastDue: true,
      nplClassification: true,
      institution: { select: { id: true, shortName: true, name: true } },
      borrower: {
        select: {
          id: true, fullName: true, personalId: true,
          dateOfBirth: true, email: true, address: true, city: true,
          phones: { where: { isActive: true }, orderBy: { isPrimary: 'desc' as const }, select: { phoneNumber: true, phoneType: true, isPrimary: true } },
        },
      },
      relatedParties: {
        select: {
          role: true,
          person: {
            select: {
              id: true, fullName: true, personalId: true,
              phones: { where: { isActive: true }, orderBy: { isPrimary: 'desc' as const }, select: { phoneNumber: true, phoneType: true, isPrimary: true } },
            },
          },
        },
      },
    },
  },
  activities: {
    orderBy: { occurredAt: 'desc' as const },
    take: 50,
    select: {
      id: true, activityType: true, channel: true, notes: true,
      outcome: true, occurredAt: true, nextActionDate: true, promiseAmount: true,
      officer: { select: { id: true, fullName: true } },
    },
  },
  payments: {
    orderBy: { paymentDate: 'desc' as const },
    take: 20,
    select: {
      id: true, paymentReference: true, amount: true, currency: true,
      paymentDate: true, paymentMethod: true, paymentChannel: true, notes: true,
      officer: { select: { id: true, fullName: true } },
    },
  },
  agreements: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: {
      id: true, agreementReference: true, status: true, totalAmount: true,
      currency: true, installmentCount: true, startDate: true, endDate: true,
      installments: { orderBy: { dueDate: 'asc' as const } },
    },
  },
  documents: {
    orderBy: { uploadedAt: 'desc' as const },
    take: 20,
    select: {
      id: true, documentType: true, fileName: true, uploadedAt: true, fileSize: true,
      uploadedBy: { select: { id: true, fullName: true } },
    },
  },
  legalProceedings: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: {
      id: true, proceedingRef: true, status: true, court: true,
      legalCaseNumber: true, initiationDate: true,
      filingDate: true, nextHearingDate: true, judgmentDate: true, judgmentAmount: true, notes: true,
    },
  },
};

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    stage?: string;
    institutionId?: string;
    officeId?: string;
    officerId?: string;
    view?: string;
    from?: string;
    to?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.stage) where.collectionStage = query.stage;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) { const d = new Date(query.to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    if (query.officeId) where.officeId = query.officeId;
    if (query.officerId) where.assignedOfficerId = query.officerId;
    if (query.institutionId) where.loan = { institutionId: query.institutionId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (query.view === 'promises_today') {
      where.promises = { some: { promiseDate: { gte: today, lt: tomorrow }, status: 'PENDING' } };
    } else if (query.view === 'all_promises') {
      where.promises = { some: { status: 'PENDING' } };
    } else if (query.view === 'vonesa') {
      // Promise date has passed, still no payment (status PENDING)
      where.promises = { some: { promiseDate: { lt: today }, status: 'PENDING' } };
    } else if (query.view === 'premtime_thyera') {
      // Promise date was > 30 days ago, still no payment
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.promises = {
        some: {
          promiseDate: { lt: thirtyDaysAgo },
          status: { in: ['PENDING', 'BROKEN'] },
        },
      };
    } else if (query.view === 'inactive' || query.view === 'inactive_30d') {
      where.status = { in: ['INACTIVE', 'CLOSED', 'SUSPENDED'] };
    } else if (query.view === 'legal') {
      where.legalProceedings = { some: {} };
    }

    if (query.search) {
      where.OR = [
        { caseReference: { contains: query.search, mode: 'insensitive' } },
        { loan: { loanNumber: { contains: query.search, mode: 'insensitive' } } },
        { loan: { borrower: { fullName: { contains: query.search, mode: 'insensitive' } } } },
        { loan: { borrower: { personalId: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        select: CASE_LIST_SELECT,
        orderBy: [{ priorityScore: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const c = await this.prisma.case.findFirst({
      where: { OR: [{ id }, { caseReference: id }], deletedAt: null },
      select: { ...CASE_LIST_SELECT, ...CASE_DETAIL_EXTRA },
    });
    if (!c) throw new NotFoundException('Dosja nuk u gjet');
    return c;
  }

  async updateNextAction(id: string, dto: { nextActionDate?: string; nextActionNote?: string }) {
    return this.prisma.case.update({
      where: { id },
      data: {
        ...(dto.nextActionDate && { nextActionDate: new Date(dto.nextActionDate) }),
        ...(dto.nextActionNote !== undefined && { nextActionNote: dto.nextActionNote }),
      },
      select: { id: true, nextActionDate: true, nextActionNote: true },
    });
  }

  async updateCase(id: string, dto: {
    assignedOfficerId?: string;
    secondaryOfficerId?: string;
    officeId?: string;
    currentOutstandingBalance?: number;
    maturityDate?: string;
    interestRate?: number;
    productType?: string;
    nplClassification?: string;
    // Borrower contact info
    phone1?: string;
    phone2?: string;
    email?: string;
    address?: string;
    city?: string;
  }) {
    const c = await this.prisma.case.findUnique({
      where: { id },
      select: { loanId: true, loan: { select: { borrowerId: true } } },
    });
    if (!c) throw new Error('Dosja nuk u gjet');

    const loanData: any = {};
    if (dto.currentOutstandingBalance !== undefined) loanData.currentOutstandingBalance = dto.currentOutstandingBalance;
    if (dto.maturityDate !== undefined) loanData.maturityDate = dto.maturityDate ? new Date(dto.maturityDate) : null;
    if (dto.interestRate !== undefined) loanData.interestRate = dto.interestRate;
    if (dto.productType !== undefined) loanData.productType = dto.productType;
    if (dto.nplClassification !== undefined) loanData.nplClassification = dto.nplClassification;

    const caseData: any = {};
    if (dto.assignedOfficerId !== undefined) caseData.assignedOfficerId = dto.assignedOfficerId || null;
    if (dto.secondaryOfficerId !== undefined) caseData.secondaryOfficerId = dto.secondaryOfficerId || null;
    if (dto.officeId !== undefined) caseData.officeId = dto.officeId || null;

    const borrowerData: any = {};
    if (dto.email !== undefined) borrowerData.email = dto.email || null;
    if (dto.address !== undefined) borrowerData.address = dto.address || null;
    if (dto.city !== undefined) borrowerData.city = dto.city || null;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(loanData).length && c.loanId)
        await tx.loan.update({ where: { id: c.loanId }, data: loanData });
      if (Object.keys(borrowerData).length && c.loan?.borrowerId)
        await tx.person.update({ where: { id: c.loan.borrowerId }, data: borrowerData });
      if (Object.keys(caseData).length)
        await tx.case.update({ where: { id }, data: caseData });

      // Update phones if provided
      if (dto.phone1 !== undefined && c.loan?.borrowerId) {
        await tx.personPhone.updateMany({ where: { personId: c.loan.borrowerId, isPrimary: true }, data: { phoneNumber: dto.phone1 } });
      }
      if (dto.phone2 !== undefined && c.loan?.borrowerId) {
        await tx.personPhone.updateMany({ where: { personId: c.loan.borrowerId, isPrimary: false, isActive: true }, data: { phoneNumber: dto.phone2 } });
      }
    });

    return { id };
  }

  async deletePreview(id: string) {
    const c = await this.prisma.case.findUnique({
      where: { id },
      select: {
        id: true, caseReference: true,
        loan: { select: { id: true, loanNumber: true, borrowerId: true, borrower: { select: { fullName: true, personalId: true } } } },
        _count: {
          select: {
            activities: true, agreements: true, payments: true,
            legalProceedings: true, documents: true, assignments: true,
            statusHistory: true, promises: true,
          },
        },
      },
    });
    if (!c) throw new Error('Dosja nuk u gjet');

    const otherLoans = c.loan ? await this.prisma.loan.count({ where: { borrowerId: c.loan.borrowerId, id: { not: c.loan.id } } }) : 0;
    const otherParties = c.loan ? await this.prisma.loanParty.count({ where: { personId: c.loan.borrowerId, loanId: { not: c.loan.id } } }) : 0;
    const willDeletePerson = otherLoans === 0 && otherParties === 0;

    return {
      caseReference: c.caseReference,
      borrowerName: c.loan?.borrower.fullName,
      loanNumber: c.loan?.loanNumber,
      counts: c._count,
      willDeletePerson,
      hasPayments: c._count.payments > 0,
    };
  }

  async deleteCase(id: string) {
    const c = await this.prisma.case.findUnique({
      where: { id },
      select: { id: true, loan: { select: { id: true, borrowerId: true } } },
    });
    if (!c) throw new Error('Dosja nuk u gjet');

    const loanId = c.loan?.id;
    const borrowerId = c.loan?.borrowerId;

    await this.prisma.$transaction(async (tx) => {
      // 1. Legal branch
      const proceedings = await tx.legalProceeding.findMany({ where: { caseId: id }, select: { id: true } });
      if (proceedings.length) {
        await tx.legalActivity.deleteMany({ where: { legalProceedingId: { in: proceedings.map(p => p.id) } } });
        await tx.legalProceeding.deleteMany({ where: { caseId: id } });
      }

      // 2. Agreements branch
      const agreements = await tx.agreement.findMany({ where: { caseId: id }, select: { id: true } });
      if (agreements.length) {
        await tx.agreementInstallment.deleteMany({ where: { agreementId: { in: agreements.map(a => a.id) } } });
        await tx.agreement.deleteMany({ where: { caseId: id } });
      }

      // 3. Promises (case-level and via activities)
      await tx.promiseToPay.deleteMany({ where: { caseId: id } });

      // 4. Activities
      await tx.activity.deleteMany({ where: { caseId: id } });

      // 5. Case housekeeping
      await tx.caseAssignment.deleteMany({ where: { caseId: id } });
      await tx.caseStatusHistory.deleteMany({ where: { caseId: id } });
      await tx.document.deleteMany({ where: { caseId: id } });
      await tx.payment.deleteMany({ where: { caseId: id } });

      // 6. Case itself
      await tx.case.delete({ where: { id } });

      if (loanId) {
        // 7. Loan related
        await tx.loanBalanceHistory.deleteMany({ where: { loanId } });
        await tx.loanParty.deleteMany({ where: { loanId } });
        await tx.loan.delete({ where: { id: loanId } });
      }

      if (borrowerId) {
        // 8. Delete person only if they have no other loans or party relationships
        const otherLoans = await tx.loan.count({ where: { borrowerId } });
        const otherParties = await tx.loanParty.count({ where: { personId: borrowerId } });
        if (otherLoans === 0 && otherParties === 0) {
          await tx.personPhone.deleteMany({ where: { personId: borrowerId } });
          await tx.person.delete({ where: { id: borrowerId } });
        }
      }
    });

    return { success: true };
  }

  async assignOfficer(id: string, officerId: string, assignedById: string) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.case.update({
        where: { id },
        data: { assignedOfficerId: officerId },
        select: { id: true, assignedOfficerId: true, assignedOfficer: { select: { id: true, fullName: true } } },
      }),
      this.prisma.caseAssignment.create({
        data: { caseId: id, officerId, assignedById },
      }),
    ]);
    return updated;
  }

  async searchPerson(personalId: string) {
    return this.prisma.person.findUnique({
      where: { personalId },
      select: {
        id: true, personalId: true, fullName: true,
        email: true, address: true, city: true,
        phones: { where: { isActive: true }, orderBy: { isPrimary: 'desc' as const }, select: { phoneNumber: true, phoneType: true, isPrimary: true } },
        loans: {
          select: {
            id: true, loanNumber: true, currentOutstandingBalance: true,
            case: { select: { id: true, caseReference: true, status: true } },
            institution: { select: { shortName: true } },
          },
        },
      },
    });
  }

  async createCase(dto: {
    // Person (borrower)
    personalId: string;
    fullName: string;
    dateOfBirth?: string;
    phone1?: string;
    phone2?: string;
    email?: string;
    address?: string;
    city?: string;
    // Loan
    loanNumber: string;
    institutionId: string;
    originalLoanAmount: number;
    disbursedAmount?: number;
    currentOutstandingBalance: number;
    currency?: string;
    interestRate?: number;
    productType?: string;
    disbursementDate?: string;
    maturityDate?: string;
    daysPastDue?: number;
    nplClassification?: string;
    // Case
    officeId?: string;
    assignedOfficerId?: string;
    secondaryOfficerId?: string;
    collectionStage?: string;
    registrationDate?: string;
  }, createdById: string) {
    // Check loan number not already used
    const existing = await this.prisma.loan.findUnique({ where: { loanNumber: dto.loanNumber } });
    if (existing) throw new BadRequestException(`Numri i kredisë ${dto.loanNumber} ekziston tashmë`);

    // Upsert person (by personalId)
    const person = await this.prisma.person.upsert({
      where: { personalId: dto.personalId },
      update: {
        fullName: dto.fullName,
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
      },
      create: {
        personalId: dto.personalId,
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        email: dto.email,
        address: dto.address,
        city: dto.city,
      },
    });

    // Upsert phone numbers into person_phones (only add if not already present)
    if (dto.phone1) {
      const exists = await this.prisma.personPhone.findFirst({ where: { personId: person.id, phoneNumber: dto.phone1 } });
      if (!exists) await this.prisma.personPhone.create({ data: { personId: person.id, phoneNumber: dto.phone1, phoneType: 'MOBILE', isPrimary: true } });
    }
    if (dto.phone2) {
      const exists = await this.prisma.personPhone.findFirst({ where: { personId: person.id, phoneNumber: dto.phone2 } });
      if (!exists) await this.prisma.personPhone.create({ data: { personId: person.id, phoneNumber: dto.phone2, phoneType: 'MOBILE', isPrimary: false } });
    }

    // Create loan + case in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Generate a collision-free reference inside the transaction using an advisory lock
      const year = new Date().getFullYear();
      const [{ count }] = await tx.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM cases WHERE EXTRACT(YEAR FROM created_at) = ${year}
      `;
      const caseRef = `DLR-${year}-${String(Number(count) + 1).padStart(4, '0')}`;
      const loan = await tx.loan.create({
        data: {
          loanNumber: dto.loanNumber,
          institutionId: dto.institutionId,
          borrowerId: person.id,
          originalLoanAmount: dto.originalLoanAmount,
          disbursedAmount: dto.disbursedAmount ?? dto.originalLoanAmount,
          currentOutstandingBalance: dto.currentOutstandingBalance,
          currency: dto.currency ?? 'EUR',
          interestRate: dto.interestRate,
          productType: dto.productType,
          disbursementDate: dto.disbursementDate ? new Date(dto.disbursementDate) : new Date(),
          maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : undefined,
          daysPastDue: dto.daysPastDue ?? 0,
          nplClassification: dto.nplClassification as any,
        },
      });

      const newCase = await tx.case.create({
        data: {
          caseReference: caseRef,
          loanId: loan.id,
          officeId: dto.officeId,
          assignedOfficerId: dto.assignedOfficerId,
          secondaryOfficerId: dto.secondaryOfficerId,
          registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : undefined,
          collectionStage: (dto.collectionStage as CollectionStage) ?? CollectionStage.D1,
          priorityScore: Math.min(dto.daysPastDue ?? 0, 999),
        },
        select: { ...CASE_LIST_SELECT, ...CASE_DETAIL_EXTRA },
      });

      // Log creation in history
      await tx.caseStatusHistory.create({
        data: {
          caseId: newCase.id,
          changedById: createdById,
          field: 'status',
          oldValue: null,
          newValue: 'ACTIVE',
          note: 'Case created',
        },
      });

      return newCase;
    });

    return result;
  }

  async updateStatus(id: string, dto: { status?: string; collectionStage?: string; note?: string }, changedById: string) {
    const current = await this.prisma.case.findUnique({ where: { id }, select: { status: true, collectionStage: true } });
    if (!current) throw new NotFoundException('Dosja nuk u gjet');

    const updates: any = {};
    const historyEntries: any[] = [];

    if (dto.status && dto.status !== current.status) {
      updates.status = dto.status as CaseStatus;
      historyEntries.push({ field: 'status', oldValue: current.status, newValue: dto.status, note: dto.note });
    }
    if (dto.collectionStage && dto.collectionStage !== current.collectionStage) {
      updates.collectionStage = dto.collectionStage as CollectionStage;
      historyEntries.push({ field: 'collectionStage', oldValue: current.collectionStage, newValue: dto.collectionStage, note: dto.note });
    }

    if (Object.keys(updates).length === 0) return current;

    const [updated] = await this.prisma.$transaction([
      this.prisma.case.update({ where: { id }, data: updates, select: { id: true, status: true, collectionStage: true } }),
      ...historyEntries.map((e) =>
        this.prisma.caseStatusHistory.create({
          data: { caseId: id, changedById, ...e },
        }),
      ),
    ]);
    return updated;
  }

  async getHistory(id: string) {
    return this.prisma.caseStatusHistory.findMany({
      where: { caseId: id },
      orderBy: { changedAt: 'desc' },
      select: {
        id: true, field: true, oldValue: true, newValue: true, note: true, changedAt: true,
        changedBy: { select: { fullName: true } },
      },
    });
  }

  async getDashboardStats(officeId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // All case-scoped queries filter by office when provided
    const caseScope = officeId ? { officeId } : {};
    const caseFilter = { status: 'ACTIVE' as const, ...caseScope };

    const [
      activeCases,
      totalOutstanding,
      collectionsThisMonth,
      promisesToday,
      activeAgreements,
      overdueInstallments,
      legalCases,
      officeStats,
    ] = await Promise.all([
      this.prisma.case.count({ where: caseFilter }),
      this.prisma.loan.aggregate({
        where: { case: { ...caseScope } },
        _sum: { currentOutstandingBalance: true },
      }),
      this.prisma.payment.aggregate({
        where: { paymentDate: { gte: startOfMonth }, ...(officeId ? { case: { officeId } } : {}) },
        _sum: { amount: true },
      }),
      this.prisma.activity.count({
        where: {
          activityType: 'PROMISE_TO_PAY',
          nextActionDate: { gte: today, lt: tomorrow },
          ...(officeId ? { case: { officeId } } : {}),
        },
      }),
      this.prisma.agreement.count({ where: { case: { ...caseScope } } }),
      this.prisma.agreementInstallment.count({
        where: { status: 'OVERDUE', agreement: { case: { ...caseScope } } },
      }),
      this.prisma.case.count({ where: { legalProceedings: { some: {} }, ...caseScope } }),
      this.prisma.office.findMany({
        where: officeId ? { id: officeId } : undefined,
        select: {
          id: true, name: true,
          _count: { select: { cases: { where: { status: 'ACTIVE' } } } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Monthly collections for last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const rawPayments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { gte: sixMonthsAgo },
        ...(officeId ? { case: { officeId } } : {}),
      },
      select: { paymentDate: true, amount: true },
    });

    // Group by month
    const monthlyMap: Record<string, number> = {};
    for (const p of rawPayments) {
      const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] ?? 0) + Number(p.amount);
    }
    const monthlyCollections = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));

    return {
      activeCases,
      totalOutstanding: Number(totalOutstanding._sum.currentOutstandingBalance ?? 0),
      collectionsThisMonth: Number(collectionsThisMonth._sum.amount ?? 0),
      promisesToday,
      activeAgreements,
      overdueInstallments,
      legalCases,
      officeStats: officeStats.map((o) => ({ ...o, activeCases: o._count.cases })),
      monthlyCollections,
    };
  }
}
