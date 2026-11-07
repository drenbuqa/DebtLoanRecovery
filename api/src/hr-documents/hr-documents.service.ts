import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const DOC_META = {
  id: true, title: true, description: true,
  fileName: true, mimeType: true, fileSize: true,
  uploadedAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class HrDocumentsService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

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
    fileBuffer: Buffer;
    uploadedById: string;
  }) {
    const fileKey = await this.storage.upload(dto.fileBuffer, dto.fileName, dto.mimeType);
    return this.prisma.hrDocument.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        fileKey,
        uploadedById: dto.uploadedById,
      },
      select: DOC_META,
    });
  }

  async getSignedUrl(id: string): Promise<string> {
    const doc = await this.prisma.hrDocument.findUnique({
      where: { id },
      select: { fileKey: true },
    });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    return this.storage.getSignedUrl(doc.fileKey);
  }

  async delete(id: string) {
    const doc = await this.prisma.hrDocument.findUnique({ where: { id }, select: { fileKey: true } });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    await this.storage.delete(doc.fileKey);
    await this.prisma.hrDocument.delete({ where: { id } });
    return { deleted: true };
  }
}
