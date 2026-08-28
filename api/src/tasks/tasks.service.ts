import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskPriority } from '@prisma/client';

const TASK_SELECT = {
  id: true, title: true, description: true, dueDate: true, priority: true,
  completedAt: true, createdAt: true,
  case: { select: { id: true, caseReference: true } },
  assignedTo: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; caseId?: string; assignedToId?: string; completed?: boolean; officeId?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.caseId) where.caseId = query.caseId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.officeId) where.case = { officeId: query.officeId };
    if (query.completed === true) where.completedAt = { not: null };
    if (query.completed === false) where.completedAt = null;

    const [total, data] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where, select: TASK_SELECT,
        orderBy: [{ completedAt: { sort: 'asc', nulls: 'first' } }, { dueDate: 'asc' }],
        skip, take: limit,
      }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async create(dto: {
    title: string;
    description?: string;
    dueDate?: string;
    caseId?: string;
    assignedToId?: string;
    priority?: string;
  }, createdById?: string) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        caseId: dto.caseId,
        assignedToId: dto.assignedToId,
        createdById: createdById,
        priority: (dto.priority as TaskPriority) ?? TaskPriority.MEDIUM,
      },
      select: TASK_SELECT,
    });
  }

  async complete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id },
      data: { completedAt: new Date() },
      select: TASK_SELECT,
    });
  }

  async uncomplete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id },
      data: { completedAt: null },
      select: TASK_SELECT,
    });
  }

  async update(id: string, dto: { title?: string; description?: string; dueDate?: string; priority?: string; assignedToId?: string }) {
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.priority && { priority: dto.priority as TaskPriority }),
        ...(dto.assignedToId !== undefined && { assignedTo: dto.assignedToId ? { connect: { id: dto.assignedToId } } : { disconnect: true } }),
      },
      select: TASK_SELECT,
    });
  }
}
