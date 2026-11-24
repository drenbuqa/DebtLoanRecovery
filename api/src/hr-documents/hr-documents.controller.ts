import {
  Controller, Get, Post, Delete, Param, Body,
  UseInterceptors, UploadedFile, Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HrDocumentsService } from './hr-documents.service';
import { RequireRoles } from '../auth/roles.guard';

@Controller('hr-documents')
export class HrDocumentsController {
  constructor(private svc: HrDocumentsService) {}

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
  async getFile(@Param('id') id: string) {
    const url = await this.svc.getSignedUrl(id);
    return { url };
  }

  @Delete(':id')
  @RequireRoles('ADMIN')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
