import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    let fileKey: string;
    try {
      fileKey = await this.storage.upload(dto.fileBuffer, dto.fileName, dto.mimeType);
    } catch {
      throw new BadRequestException('Gabim gjatë ngarkimit të skedarit. Kontrolloni konfigurimin e ruajtjes.');
    }
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

  async getFileInfo(id: string): Promise<{ fileKey: string; fileName: string; mimeType: string }> {
    const doc = await this.prisma.hrDocument.findUnique({
      where: { id },
      select: { fileKey: true, fileName: true, mimeType: true },
    });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    if (doc.fileKey.startsWith('legacy/')) {
      throw new BadRequestException(
        'Ky dokument është importuar nga sistemi i vjetër dhe nuk mund të hapet. Ju lutemi ngarkoni përsëri dokumentin.',
      );
    }
    return doc;
  }

  async getSignedUrl(id: string): Promise<string> {
    const doc = await this.getFileInfo(id);
    return this.storage.getSignedUrl(doc.fileKey);
  }

  async delete(id: string) {
    const doc = await this.prisma.hrDocument.findUnique({ where: { id }, select: { fileKey: true } });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    try { await this.storage.delete(doc.fileKey); } catch { /* file may not exist in storage; continue */ }
    await this.prisma.hrDocument.delete({ where: { id } });
    return { deleted: true };
  }
}
