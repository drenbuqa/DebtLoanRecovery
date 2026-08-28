import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OfficesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const offices = await this.prisma.office.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true, cases: true } },
      },
    });
    return offices.map((o) => ({
      id: o.id,
      name: o.name,
      code: o.code,
      isActive: o.isActive,
      userCount: o._count.users,
      caseCount: o._count.cases,
    }));
  }

  async create(dto: { name: string; code: string }) {
    return this.prisma.office.create({ data: { name: dto.name, code: dto.code.toUpperCase() } });
  }
}
