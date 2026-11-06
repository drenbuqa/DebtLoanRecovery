import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DOC_META = {
  id: true, title: true, description: true,
  fileName: true, mimeType: true, fileSize: true,
  uploadedAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class HrDocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.hrDocument.findMany({
      select: DOC_META,
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async create(dto: {
    title: string;
    description?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileData: Buffer;
    uploadedById: string;
  }) {
    return this.prisma.hrDocument.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        fileData: dto.fileData,
        uploadedById: dto.uploadedById,
      },
      select: DOC_META,
    });
  }

  async getFile(id: string): Promise<{ fileData: Buffer; fileName: string; mimeType: string }> {
    const doc = await this.prisma.hrDocument.findUnique({
      where: { id },
      select: { fileData: true, fileName: true, mimeType: true },
    });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    return { fileData: doc.fileData as Buffer, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async delete(id: string) {
    const doc = await this.prisma.hrDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    await this.prisma.hrDocument.delete({ where: { id } });
    return { deleted: true };
  }
}
