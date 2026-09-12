import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AgreementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AGR_SELECT = {
  id: true, agreementReference: true, status: true, totalAmount: true,
  currency: true, installmentCount: true, startDate: true, endDate: true,
  notes: true, createdAt: true,
  case: {
    select: {
      id: true, caseReference: true,
      loan: { select: { loanNumber: true, borrower: { select: { firstName: true, lastName: true } }, institution: { select: { shortName: true } } } },
    },
  },
  installments: { orderBy: { dueDate: 'asc' as const } },
};

@Injectable()
export class AgreementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; caseId?: string; status?: string; officerId?: string; officeId?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.caseId)   where.caseId = query.caseId;
    if (query.status)   where.status  = query.status;
    if (query.officerId) where.case = { assignedOfficerId: query.officerId };
    if (query.officeId)  where.case = { ...where.case, officeId: query.officeId };

    const [total, data] = await Promise.all([
      this.prisma.agreement.count({ where }),
      this.prisma.agreement.findMany({ where, select: AGR_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    // Stats scoped to same filter
    const [active, broken, overdueInstallments] = await Promise.all([
      this.prisma.agreement.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.agreement.count({ where: { ...where, status: 'BROKEN' } }),
      this.prisma.agreementInstallment.count({ where: { status: 'OVERDUE', agreement: where } }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) }, stats: { active, broken, overdueInstallments } };
  }

  async findOne(id: string) {
    const a = await this.prisma.agreement.findUnique({ where: { id }, select: AGR_SELECT });
    if (!a) throw new NotFoundException('Marrëveshja nuk u gjet');
    return a;
  }

  async create(dto: {
    caseId: string;
    totalAmount: number;
    currency?: string;
    installmentCount: number;
    startDate: string;
    notes?: string;
  }) {
    const start = new Date(dto.startDate);
    const installmentAmount = dto.totalAmount / dto.installmentCount;

    // Calculate end date
    const end = new Date(start);
    end.setMonth(end.getMonth() + dto.installmentCount - 1);

    const installments = Array.from({ length: dto.installmentCount }, (_, i) => {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      return { installmentNumber: i + 1, dueDate: due, amount: parseFloat(installmentAmount.toFixed(2)), currency: dto.currency ?? 'EUR' };
    });

    const year = new Date().getFullYear();
    const [{ count }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM agreements WHERE EXTRACT(YEAR FROM created_at) = ${year}
    `;
    const ref = `AGR-${year}-${String(Number(count) + 1).padStart(4, '0')}`;

    return this.prisma.agreement.create({
      data: {
        caseId: dto.caseId,
        agreementReference: ref,
        status: AgreementStatus.ACTIVE,
        totalAmount: dto.totalAmount,
        currency: dto.currency ?? 'EUR',
        installmentCount: dto.installmentCount,
        startDate: start,
        endDate: end,
        notes: dto.notes,
        installments: { create: installments },
      },
      select: AGR_SELECT,
    });
  }

  async markInstallmentPaid(installmentId: string, paidAmount?: number) {
    const inst = await this.prisma.agreementInstallment.findUnique({ where: { id: installmentId } });
    if (!inst) throw new NotFoundException('Kësti nuk u gjet');
    if (inst.status === 'PAID') throw new BadRequestException('Ky këst është paguar tashmë');

    const amount = Number(inst.amount);
    const paid = paidAmount !== undefined ? Number(paidAmount) : amount;

    if (paid <= 0) throw new BadRequestException('Shuma e paguar duhet të jetë më e madhe se zero');
    if (paid > amount) throw new BadRequestException(`Shuma e paguar (${paid}) tejkalon shumën e këstit (${amount})`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.agreementInstallment.update({
        where: { id: installmentId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paidAmount: paid,
        },
      });

      // Check if all installments for this agreement are now settled (PAID or WAIVED)
      const remaining = await tx.agreementInstallment.count({
        where: {
          agreementId: inst.agreementId,
          status: { notIn: ['PAID', 'WAIVED'] },
        },
      });

      if (remaining === 0) {
        await tx.agreement.update({
          where: { id: inst.agreementId },
          data: { status: AgreementStatus.COMPLETED },
        });
      }

      return updated;
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.agreement.update({
      where: { id },
      data: { status: status as AgreementStatus },
      select: { id: true, status: true },
    });
  }
}
