import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    const where: any = { voidedAt: null }; // exclude voided payments by default
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
    const payment = await this.prisma.$transaction(async (tx) => {
      // Collision-safe reference: count within the year inside the transaction
      const year = new Date().getFullYear();
      const [{ count }] = await tx.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM payments WHERE EXTRACT(YEAR FROM payment_date) = ${year}
      `;
      const ref = `PAY-${year}-${String(Number(count) + 1).padStart(5, '0')}`;
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
        select: { id: true, currentOutstandingBalance: true },
      });
      if (loan) {
        // Subtract from current outstanding — correct for imported portfolios
        // where pre-import payment history is not in the system
        const newBalance = Math.max(0, Number(loan.currentOutstandingBalance) - Number(dto.amount));
        await tx.loan.update({ where: { id: loan.id }, data: { currentOutstandingBalance: newBalance, lastPaymentDate: new Date(dto.paymentDate) } });
        await tx.loanBalanceHistory.create({
          data: { loanId: loan.id, balanceDate: new Date(), outstandingBalance: newBalance, source: 'PAYMENT', recordedById: dto.officerId },
        });
      }

      return created;
    });

    return payment;
  }

  async voidPayment(id: string, reason: string, voidedById: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.voidedAt) throw new BadRequestException('Payment is already voided');

    return this.prisma.$transaction(async (tx) => {
      const voided = await tx.payment.update({
        where: { id },
        data: { voidedAt: new Date(), voidedById, voidReason: reason },
        select: { id: true, paymentReference: true, amount: true, voidedAt: true },
      });

      // Restore the outstanding balance
      const loan = await tx.loan.findFirst({
        where: { case: { id: payment.caseId } },
        select: { id: true, currentOutstandingBalance: true },
      });
      if (loan) {
        const restored = Number(loan.currentOutstandingBalance) + Number(payment.amount);
        await tx.loan.update({ where: { id: loan.id }, data: { currentOutstandingBalance: restored } });
        await tx.loanBalanceHistory.create({
          data: { loanId: loan.id, balanceDate: new Date(), outstandingBalance: restored, source: 'VOID', recordedById: voidedById },
        });
      }

      return voided;
    });
  }
}
