import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  username?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: entry });
    } catch {
      // Audit failures must never break the main request
    }
  }

  async list(params: {
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.from || params.to) {
      where.occurredAt = {};
      if (params.from) where.occurredAt.gte = new Date(params.from);
      if (params.to)   where.occurredAt.lte = new Date(params.to);
    }

    const take = Math.min(params.take ?? 100, 500);
    const skip = params.skip ?? 0;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { occurredAt: 'desc' }, take, skip }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, take, skip } };
  }
}
