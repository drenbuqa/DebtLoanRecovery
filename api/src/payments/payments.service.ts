import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PAYMENT_SELECT = {
  id: true,
  paymentReference: true,
  amount: true,
  currency: true,
  paymentDate: true,
  paymentMethod: true,
  paymentChannel: true,
  notes: true,
  case: {
    select: {
      id: true,
      caseReference: true,
      loan: {
        select: {
          loanNumber: true,
          borrower: { select: { firstName: true, lastName: true } },
          institution: { select: { shortName: true } },
        },
      },
    },
  },
  officer: { select: { id: true, fullName: true } },
};

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    caseId?: string;
    officerId?: string;
    officeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.caseId)   where.caseId    = query.caseId;
    if (query.officerId) where.officerId = query.officerId;
    if (query.officeId) where.case       = { officeId: query.officeId };
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, data, todaySum, monthSum] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        select: PAYMENT_SELECT,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.aggregate({ where: { ...where, paymentDate: { gte: startOfDay } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { ...where, paymentDate: { gte: startOfMonth } }, _sum: { amount: true } }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      stats: {
        todayTotal: todaySum._sum.amount ?? 0,
        monthTotal: monthSum._sum.amount ?? 0,
      },
    };
  }

  async register(dto: {
    caseId: string;
    officerId: string;
    amount: number;
    currency?: string;
    paymentDate: string;
    paymentMethod: string;
    paymentChannel?: string;
    notes?: string;
    externalReference?: string;
  }) {
    const ref = `PAY-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          caseId: dto.caseId,
          officerId: dto.officerId,
          paymentReference: ref,
          amount: dto.amount,
          currency: dto.currency ?? 'EUR',
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod as PaymentMethod,
          paymentChannel: dto.paymentChannel,
          notes: dto.notes,
          externalReference: dto.externalReference,
        },
        select: PAYMENT_SELECT,
      });

      // Reconcile outstanding balance from all payments — prevents drift from decrement/increment
      const loan = await tx.loan.findFirst({
        where: { case: { id: dto.caseId } },
        select: { id: true, originalLoanAmount: true },
      });
      if (loan) {
        const totalPaid = await tx.payment.aggregate({
          where: { caseId: dto.caseId },
          _sum: { amount: true },
        });
        const paid = totalPaid._sum.amount ?? 0;
        const outstanding = Number(loan.originalLoanAmount) - Number(paid);
        await tx.loan.update({
          where: { id: loan.id },
          data: { currentOutstandingBalance: Math.max(0, outstanding) },
        });
      }

      return created;
    });

    return payment;
  }
}
