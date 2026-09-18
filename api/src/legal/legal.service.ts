import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LP_SELECT = {
  id: true, caseId: true, proceedingRef: true, court: true,
  legalCaseNumber: true, initiationDate: true,
  filingDate: true, nextHearingDate: true, judgmentDate: true, judgmentAmount: true, status: true,
  notes: true, createdAt: true,
  case: {
    select: {
      id: true, caseReference: true,
      loan: {
        select: {
          loanNumber: true,
          borrower: { select: { fullName: true, personalId: true } },
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

  async findAll(query: { page?: number; limit?: number; status?: string; view?: string; officeId?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status)   where.status = query.status;
    if (query.officeId) where.case   = { officeId: query.officeId };
    // "in_progress" view: proceedings that have at least one hearing registered
    if (query.view === 'in_progress') {
      where.activities = { some: { activityType: 'HEARING' } };
    }
    // "judgment" view: proceedings with a court judgment registered (judgmentDate set OR JUDGMENT activity)
    if (query.view === 'judgment') {
      where.OR = [
        { judgmentDate: { not: null } },
        { activities: { some: { activityType: 'JUDGMENT' } } },
      ];
    }
    // "enforcement" view: proceedings with enforcement registered (ENFORCEMENT activity OR status=ENFORCEMENT)
    if (query.view === 'enforcement') {
      where.OR = [
        { status: 'ENFORCEMENT' },
        { activities: { some: { activityType: 'ENFORCEMENT' } } },
      ];
    }

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
    if (!lp) throw new NotFoundException('Procedimi juridik nuk u gjet');
    return lp;
  }

  async create(dto: {
    caseId: string;
    court?: string;
    legalCaseNumber?: string;
    filingDate: string;
    initiationDate?: string;
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
          legalCaseNumber: dto.legalCaseNumber,
          filingDate: new Date(dto.filingDate),
          initiationDate: dto.initiationDate ? new Date(dto.initiationDate) : undefined,
          nextHearingDate: dto.nextHearingDate ? new Date(dto.nextHearingDate) : undefined,
          notes: dto.notes,
        },
        select: LP_SELECT,
      });
    });
  }

  async update(id: string, dto: {
    status?: string;
    court?: string;
    legalCaseNumber?: string;
    initiationDate?: string;
    nextHearingDate?: string;
    judgmentDate?: string;
    judgmentAmount?: number;
    notes?: string;
  }) {
    return this.prisma.legalProceeding.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status as any }),
        ...(dto.court !== undefined && { court: dto.court }),
        ...(dto.legalCaseNumber !== undefined && { legalCaseNumber: dto.legalCaseNumber }),
        ...(dto.initiationDate && { initiationDate: new Date(dto.initiationDate) }),
        ...(dto.nextHearingDate && { nextHearingDate: new Date(dto.nextHearingDate) }),
        ...(dto.judgmentDate && { judgmentDate: new Date(dto.judgmentDate) }),
        ...(dto.judgmentAmount !== undefined && { judgmentAmount: dto.judgmentAmount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      select: LP_SELECT,
    });
  }
}
