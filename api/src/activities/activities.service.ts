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
    updatedAddress?: string;
    updatedPhone?: string;
    collectionStatus?: string;
  }) {
    const activity = await this.prisma.activity.create({
      data: {
        caseId: dto.caseId,
        officerId: dto.officerId,
        activityType: dto.activityType as ActivityType,
        channel: dto.channel,
        notes: dto.notes,
        outcome: dto.outcome as ActivityOutcome | undefined,
        occurredAt: (() => {
          if (!dto.occurredAt) return new Date();
          const d = new Date(dto.occurredAt);
          // date-only strings (e.g. "2026-10-23") parse to UTC midnight — replace time with now
          if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
            const now = new Date();
            d.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), 0);
          }
          return d;
        })(),
        ...(dto.nextActionDate && { nextActionDate: new Date(dto.nextActionDate) }),
        ...(dto.promiseAmount && {
          promiseAmount: dto.promiseAmount,
          promiseCurrency: dto.promiseCurrency ?? 'EUR',
        }),
        ...(dto.updatedAddress && { updatedAddress: dto.updatedAddress }),
        ...(dto.updatedPhone && { updatedPhone: dto.updatedPhone }),
      },
      select: {
        id: true, activityType: true, channel: true, notes: true,
        outcome: true, occurredAt: true, nextActionDate: true,
        promiseAmount: true, updatedAddress: true, updatedPhone: true,
        officer: { select: { id: true, fullName: true } },
      },
    });

    const isPromise = dto.activityType === 'PROMISE_TO_PAY' || dto.outcome === 'PROMISE_RECEIVED';

    // Recalculate case.nextActionDate from the earliest future non-promise activity.
    // This runs on every activity creation so the field stays accurate (handles old data,
    // expired dates, and new activities that don't select a follow-up date).
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const ndjekja = await this.prisma.activity.findFirst({
      where: {
        caseId: dto.caseId,
        activityType: { not: 'PROMISE_TO_PAY' as any },
        outcome: { not: 'PROMISE_RECEIVED' as any },
        nextActionDate: { gte: now },
      },
      orderBy: { nextActionDate: 'asc' },
      select: { nextActionDate: true, notes: true },
    });
    await this.prisma.case.update({
      where: { id: dto.caseId },
      data: {
        nextActionDate: ndjekja?.nextActionDate ?? null,
        nextActionNote: ndjekja?.notes ?? null,
      },
    });

    // Derive collectionStatus from outcome when not explicitly set
    const outcomeStatusMap: Record<string, string> = {
      PROMISE_RECEIVED: 'ZOTIM_PAGESE',
      REFUSED:          'NUK_PRANON_MARREVESHJE',
      DISPUTE:          'KONTESTIM_BORGJI',
      NO_ANSWER:        'PAKONTAKTUAR',
      DECEASED:         'TJERA',
    };
    const autoStatus = isPromise
      ? 'ZOTIM_PAGESE'
      : (dto.outcome ? outcomeStatusMap[dto.outcome] : null) ?? dto.collectionStatus;

    if (autoStatus) {
      await this.prisma.case.update({
        where: { id: dto.caseId },
        data: { collectionStatus: autoStatus as any },
      });
    }

    // Create a structured PromiseToPay record for every promise (amount may be 0 if not specified)
    if (isPromise) {
      await this.prisma.promiseToPay.create({
        data: {
          caseId: dto.caseId,
          activityId: activity.id,
          createdById: dto.officerId,
          promisedAmount: dto.promiseAmount ?? 0,
          currency: dto.promiseCurrency ?? 'EUR',
          promiseDate: dto.nextActionDate ? new Date(dto.nextActionDate) : new Date(),
        },
      });
    }

    return activity;
  }

  async findAll(query: { page?: number; limit?: number; officerId?: string; officeId?: string; activityType?: string | string[]; from?: string; to?: string; caseId?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 5000);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.caseId)    where.caseId = query.caseId;
    if (query.officerId) where.officerId = query.officerId;
    if (query.officeId) {
      const officeOfficers = await this.prisma.user.findMany({
        where: { officeId: query.officeId },
        select: { id: true },
      });
      const officerIds = officeOfficers.map((u) => u.id);
      where.case = officerIds.length > 0
        ? { OR: [{ officeId: query.officeId }, { assignedOfficerId: { in: officerIds } }, { secondaryOfficerId: { in: officerIds } }] }
        : { officeId: query.officeId };
    }
    if (query.activityType) {
      const types = Array.isArray(query.activityType)
        ? query.activityType
        : query.activityType.split(',').filter(Boolean);
      where.activityType = types.length === 1 ? types[0] : { in: types };
    }
    if (query.from || query.to) {
      where.occurredAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to + 'T23:59:59') }),
      };
    }

    const ACTIVITY_SELECT = {
      id: true, activityType: true, channel: true, notes: true, outcome: true,
      occurredAt: true, nextActionDate: true, promiseAmount: true,
      officer: { select: { fullName: true } },
      case: {
        select: {
          id: true, caseReference: true,
          loan: { select: { loanNumber: true, borrower: { select: { fullName: true } } } },
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
        promiseAmount: true, updatedAddress: true, updatedPhone: true,
        officer: { select: { id: true, fullName: true } },
      },
    });
  }

  async deleteActivity(id: string) {
    await this.prisma.activity.delete({ where: { id } });
    return { success: true };
  }

  // Backfill PromiseToPay records for existing PROMISE_RECEIVED activities that lack them
  async backfillPromiseReceivedActivities() {
    const activities = await this.prisma.activity.findMany({
      where: {
        outcome: 'PROMISE_RECEIVED' as any,
        promise: null,
      },
      select: { id: true, caseId: true, officerId: true, promiseAmount: true, nextActionDate: true, occurredAt: true },
    });

    let created = 0;
    for (const a of activities) {
      await this.prisma.promiseToPay.create({
        data: {
          caseId: a.caseId,
          activityId: a.id,
          createdById: a.officerId,
          promisedAmount: (a.promiseAmount as any) ?? 0,
          currency: 'EUR',
          promiseDate: a.nextActionDate ?? a.occurredAt,
        },
      });
      created++;
    }
    return { backfilled: created };
  }
}
