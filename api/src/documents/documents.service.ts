import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const DOC_SELECT = {
  id: true, fileName: true, fileSize: true, mimeType: true,
  documentType: true, notes: true, uploadedAt: true, storagePath: true,
  uploadedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findByCaseId(caseId: string) {
    return this.prisma.document.findMany({
      where: { caseId },
      select: DOC_SELECT,
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async create(dto: {
    caseId: string;
    uploadedById: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
    notes?: string;
  }) {
    return this.prisma.document.create({
      data: {
        caseId: dto.caseId,
        uploadedById: dto.uploadedById,
        documentType: dto.documentType as any,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        storagePath: dto.storagePath,
        notes: dto.notes,
      },
      select: DOC_SELECT,
    });
  }

  async getFilePath(documentId: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    return { filePath: doc.storagePath, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async delete(documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Dokumenti nuk u gjet');
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      fs.unlinkSync(doc.storagePath);
    }
    await this.prisma.document.delete({ where: { id: documentId } });
    return { deleted: true };
  }
}
