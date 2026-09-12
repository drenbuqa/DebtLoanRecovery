import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const institutions = await this.prisma.institution.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { loans: true } },
      },
    });

    return institutions.map((i) => ({
      id: i.id,
      name: i.name,
      shortName: i.shortName,
      isActive: i.isActive,
      loanCount: i._count.loans,
      createdAt: i.createdAt,
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
    return this.prisma.institution.create({
      data: { name: dto.name, shortName: dto.shortName },
    });
  }

  async update(id: string, dto: { name?: string; shortName?: string; isActive?: boolean }) {
    return this.prisma.institution.update({
      where: { id },
      data: dto,
    });
  }

  async stats() {
    const institutions = await this.prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, shortName: true,
        loans: {
          select: {
            currentOutstandingBalance: true,
            case: { select: { status: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return institutions.map((inst) => {
      const activeCases = inst.loans.filter((l) => l.case?.status === 'ACTIVE').length;
      const totalOutstanding = inst.loans.reduce(
        (sum, l) => sum + Number(l.currentOutstandingBalance), 0,
      );
      return {
        id: inst.id,
        name: inst.name,
        shortName: inst.shortName,
        activeCases,
        totalOutstanding,
        totalLoans: inst.loans.length,
      };
    });
  }
}
