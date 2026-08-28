import {
  Controller, Post, Get, Res, Request, UseInterceptors, UploadedFile,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ImportService } from './import.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

const ALLOWED_IMPORT_MIME = new Set([
  'text/csv', 'application/csv', 'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

@Controller('import')
@UseGuards(RolesGuard)
@RequireRoles('ADMIN', 'MANAGER')
export class ImportController {
  constructor(private svc: ImportService) {}

  /** Download a blank import template so staff know the expected format */
  @Get('template')
  template(@Res() res: Response) {
    const csv = this.svc.templateCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dlr-import-template.csv"');
    res.send(csv);
  }

  /** Upload a CSV or Excel file to bulk-import loan portfolios */
  @Post('loans')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMPORT_MIME.has(file.mimetype)) cb(null, true);
      else cb(new Error('Only CSV and Excel files are accepted'), false);
    },
  }))
  async importLoans(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.svc.importFile(file.buffer, file.mimetype, req.user.id, req.user.username);
  }
}
