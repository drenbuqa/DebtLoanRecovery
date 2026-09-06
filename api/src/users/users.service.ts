import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const USER_PUBLIC = {
  id: true, username: true, fullName: true, email: true,
  role: true, isActive: true, officeId: true, createdAt: true,
  office: { select: { id: true, name: true } },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(query: { officeId?: string; isActive?: boolean }) {
    return this.prisma.user.findMany({
      where: {
        ...(query.officeId && { officeId: query.officeId }),
        ...(query.isActive !== undefined && { isActive: query.isActive }),
      },
      select: USER_PUBLIC,
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: USER_PUBLIC });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(dto: { username: string; password: string; fullName: string; email: string; role: string; officeId?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException('Username already taken');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role as any,
        ...(dto.officeId && { officeId: dto.officeId }),
      },
      select: USER_PUBLIC,
    });
  }

  async update(id: string, dto: { fullName?: string; email?: string; role?: string; officeId?: string; isActive?: boolean; password?: string }) {
    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.officeId !== undefined) data.officeId = dto.officeId || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      (data as any).tokenVersion = { increment: 1 };
    }
    return this.prisma.user.update({ where: { id }, data, select: USER_PUBLIC });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false }, select: USER_PUBLIC });
  }

  async stats() {
    const [total, active, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    ]);
    const roleMap: Record<string, number> = {};
    for (const r of byRole) roleMap[r.role] = r._count.id;
    return { total, active, byRole: roleMap };
  }
}
