import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LP_SELECT = {
  id: true, caseId: true, proceedingRef: true, court: true, filingDate: true,
  nextHearingDate: true, judgmentDate: true, judgmentAmount: true, status: true,
  notes: true, createdAt: true,
  case: {
    select: {
      id: true, caseReference: true,
      loan: {
        select: {
          loanNumber: true,
          borrower: { select: { firstName: true, lastName: true, personalId: true } },
          institution: { select: { shortName: true } },
        },
      },
      assignedOfficer: { select: { fullName: true } },
    },
  },
};

@Injectable()
export class LegalService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; status?: string; officeId?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status)   where.status = query.status;
    if (query.officeId) where.case   = { officeId: query.officeId };

    const [total, data] = await Promise.all([
      this.prisma.legalProceeding.count({ where }),
      this.prisma.legalProceeding.findMany({ where, select: LP_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    const statGroups = await this.prisma.legalProceeding.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const stats: Record<string, number> = {};
    for (const s of statGroups) stats[s.status] = s._count.id;

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) }, stats };
  }

  async findOne(id: string) {
    const lp = await this.prisma.legalProceeding.findUnique({ where: { id }, select: LP_SELECT });
    if (!lp) throw new NotFoundException('Legal proceeding not found');
    return lp;
  }

  async create(dto: {
    caseId: string;
    court?: string;
    filingDate: string;
    nextHearingDate?: string;
    notes?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const [{ count }] = await tx.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM legal_proceedings WHERE EXTRACT(YEAR FROM created_at) = ${year}
      `;
      const ref = `LP-${year}-${String(Number(count) + 1).padStart(5, '0')}`;
      return tx.legalProceeding.create({
        data: {
          caseId: dto.caseId,
          proceedingRef: ref,
          court: dto.court,
          filingDate: new Date(dto.filingDate),
          nextHearingDate: dto.nextHearingDate ? new Date(dto.nextHearingDate) : undefined,
          notes: dto.notes,
        },
        select: LP_SELECT,
      });
    });
  }

  async update(id: string, dto: {
    status?: string;
    nextHearingDate?: string;
    judgmentDate?: string;
    judgmentAmount?: number;
    notes?: string;
  }) {
    return this.prisma.legalProceeding.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status as any }),
        ...(dto.nextHearingDate && { nextHearingDate: new Date(dto.nextHearingDate) }),
        ...(dto.judgmentDate && { judgmentDate: new Date(dto.judgmentDate) }),
        ...(dto.judgmentAmount !== undefined && { judgmentAmount: dto.judgmentAmount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      select: LP_SELECT,
    });
  }
}
