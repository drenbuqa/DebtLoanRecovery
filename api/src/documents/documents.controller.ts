import {
  Controller, Get, Post, Delete, Param, Request, BadRequestException,
  UseInterceptors, UploadedFile, Body, Res, HttpCode, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Allowed MIME types based on declared content-type (first-pass filter).
// Real magic-byte validation happens after the file is on disk.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]);

// Magic byte signatures for each allowed MIME type
const MAGIC: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'application/pdf',   bytes: [0x25, 0x50, 0x44, 0x46] },         // %PDF
  { mime: 'image/jpeg',        bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',         bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',         bytes: [0x47, 0x49, 0x46, 0x38] },          // GIF8
  { mime: 'image/webp',        bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (checked with WEBP at 8)
  { mime: 'application/msword',bytes: [0xD0, 0xCF, 0x11, 0xE0] },          // OLE2
  // OOXML (.docx/.xlsx) and CSV/text have no reliable magic — allowed by MIME only
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: [0x50, 0x4B, 0x03, 0x04] }, // PK zip
  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       bytes: [0x50, 0x4B, 0x03, 0x04] },
];

function validateMagicBytes(filePath: string, declaredMime: string): boolean {
  // text/plain and text/csv have no magic bytes — trust the MIME allowlist
  if (declaredMime === 'text/plain' || declaredMime === 'text/csv') return true;

  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);

  const match = MAGIC.find((m) => m.mime === declaredMime);
  if (!match) return false; // unknown type

  const matches = match.bytes.every((b, i) => buf[i] === b);

  // Extra check for WebP: bytes 8–11 must be 'WEBP'
  if (declaredMime === 'image/webp' && matches) {
    return buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  }

  return matches;
}

@Controller('documents')
@UseGuards(RolesGuard)
export class DocumentsController {
  constructor(
    private svc: DocumentsService,
    private audit: AuditService,
  ) {}

  @Get('case/:caseId')
  findByCaseId(@Param('caseId') caseId: string) {
    return this.svc.findByCaseId(caseId);
  }

  @Post('case/:caseId/upload')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOADS_DIR,
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`), false);
      }
    },
  }))
  async upload(
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    // Validate actual file content against declared MIME type
    if (!validateMagicBytes(file.path, file.mimetype)) {
      fs.unlinkSync(file.path); // delete the suspicious file immediately
      throw new BadRequestException('File content does not match its declared type');
    }

    const doc = await this.svc.create({
      caseId,
      uploadedById: req.user.id,
      documentType: documentType || 'OTHER',
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storagePath: file.path,
      notes: notes || undefined,
    });
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'DOCUMENT_UPLOAD', entity: 'Document', entityId: doc.id,
      details: `${file.originalname} (${documentType}) on case ${caseId}`,
    });
    return doc;
  }

  @Get(':id/download')
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER', 'VIEWER')
  async download(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const { filePath, fileName, mimeType } = await this.svc.getFilePath(id);
    // Prevent path traversal: the resolved path must stay inside UPLOADS_DIR
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) {
      throw new BadRequestException('Invalid file path');
    }
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'DOCUMENT_DOWNLOAD', entity: 'Document', entityId: id,
    });
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(resolved);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequireRoles('ADMIN', 'MANAGER', 'OFFICER')
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.audit.log({
      userId: req.user.id, username: req.user.username,
      action: 'DOCUMENT_DELETE', entity: 'Document', entityId: id,
    });
    return this.svc.delete(id);
  }
}
