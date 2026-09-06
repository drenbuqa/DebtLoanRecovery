import { Injectable } from '@nestjs/common';
import { ActivityType, ActivityOutcome } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async logActivity(dto: {
    caseId: string;
    officerId: string;
    activityType: string;
    channel?: string;
    notes?: string;
    outcome?: string;
    nextActionDate?: string;
    promiseAmount?: number;
    promiseCurrency?: string;
    occurredAt?: string;
  }) {
    const activity = await this.prisma.activity.create({
      data: {
        caseId: dto.caseId,
        officerId: dto.officerId,
        activityType: dto.activityType as ActivityType,
        channel: dto.channel,
        notes: dto.notes,
        outcome: dto.outcome as ActivityOutcome | undefined,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        ...(dto.nextActionDate && { nextActionDate: new Date(dto.nextActionDate) }),
        ...(dto.promiseAmount && {
          promiseAmount: dto.promiseAmount,
          promiseCurrency: dto.promiseCurrency ?? 'EUR',
        }),
      },
      select: {
        id: true, activityType: true, channel: true, notes: true,
        outcome: true, occurredAt: true, nextActionDate: true,
        promiseAmount: true,
        officer: { select: { id: true, fullName: true } },
      },
    });

    if (dto.nextActionDate) {
      await this.prisma.case.update({
        where: { id: dto.caseId },
        data: { nextActionDate: new Date(dto.nextActionDate), nextActionNote: dto.notes },
      });
    }

    // Track promises_to_pay separately for structured reporting
    if (dto.activityType === 'PROMISE_TO_PAY' && dto.promiseAmount && dto.promiseAmount > 0) {
      await this.prisma.promiseToPay.create({
        data: {
          caseId: dto.caseId,
          activityId: activity.id,
          createdById: dto.officerId,
          promisedAmount: dto.promiseAmount,
          currency: dto.promiseCurrency ?? 'EUR',
          promiseDate: dto.nextActionDate ? new Date(dto.nextActionDate) : new Date(),
        },
      });
    }

    return activity;
  }

  async findAll(query: { page?: number; limit?: number; officerId?: string; officeId?: string; activityType?: string; from?: string; to?: string; caseId?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.caseId)    where.caseId = query.caseId;
    if (query.officerId) where.officerId = query.officerId;
    if (query.officeId)  where.case = { officeId: query.officeId };
    if (query.activityType) where.activityType = query.activityType;
    if (query.from || query.to) {
      where.occurredAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to + 'T23:59:59') }),
      };
    }

    const ACTIVITY_SELECT = {
      id: true, activityType: true, notes: true, outcome: true,
      occurredAt: true, promiseAmount: true,
      officer: { select: { fullName: true } },
      case: {
        select: {
          id: true, caseReference: true,
          loan: { select: { loanNumber: true, borrower: { select: { firstName: true, lastName: true } } } },
        },
      },
    };

    const [total, data] = await Promise.all([
      this.prisma.activity.count({ where }),
      this.prisma.activity.findMany({ where, select: ACTIVITY_SELECT, orderBy: { occurredAt: 'desc' }, skip, take: limit }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  findByCaseId(caseId: string) {
    return this.prisma.activity.findMany({
      where: { caseId },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true, activityType: true, channel: true, notes: true,
        outcome: true, occurredAt: true, nextActionDate: true,
        promiseAmount: true,
        officer: { select: { id: true, fullName: true } },
      },
    });
  }
}
