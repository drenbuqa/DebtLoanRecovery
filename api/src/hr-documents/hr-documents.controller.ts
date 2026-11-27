import {
  Controller, Get, Post, Delete, Param, Body,
  UseInterceptors, UploadedFile, Request, Res,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import * as fs from 'fs';
import { HrDocumentsService } from './hr-documents.service';
import { StorageService } from '../storage/storage.service';
import { RequireRoles } from '../auth/roles.guard';

@Controller('hr-documents')
export class HrDocumentsController {
  constructor(private svc: HrDocumentsService, private storage: StorageService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @RequireRoles('ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description?: string },
    @Request() req: any,
  ) {
    return this.svc.create({
      title: body.title,
      description: body.description,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileBuffer: file.buffer,
      uploadedById: req.user.id,
    });
  }

  @Get(':id/file')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.svc.getFileInfo(id);

    if (doc.fileKey.startsWith('local:')) {
      const filePath = this.storage.localPath(doc.fileKey)!;
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Skedari nuk u gjet në disk. Ju lutemi ngarkoni përsëri dokumentin.');
      }
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const url = await this.svc.getSignedUrl(id);
    res.redirect(url);
  }

  @Delete(':id')
  @RequireRoles('ADMIN')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
