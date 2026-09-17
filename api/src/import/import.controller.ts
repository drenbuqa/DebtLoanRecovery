import {
  Controller, Post, Get, Res, Request, Query, Body,
  UseInterceptors, UploadedFile,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ImportService, ALL_FIELDS } from './import.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';

const ALLOWED_MIME = new Set([
  'text/csv', 'application/csv', 'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const fileInterceptor = () => FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Vetëm dokumentë CSV ose Excel pranohen'), false);
  },
});

@Controller('import')
@UseGuards(RolesGuard)
@RequireRoles('ADMIN', 'MANAGER')
export class ImportController {
  constructor(private svc: ImportService) {}

  @Get('template')
  template(@Res() res: Response) {
    const buf = this.svc.templateXlsx();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="dlr-import-template.xlsx"');
    res.send(buf);
  }

  @Get('fields')
  fields() {
    return ALL_FIELDS;
  }

  @Get('jobs')
  jobs(@Query('limit') limit?: string) {
    return this.svc.listJobs(limit ? Math.min(parseInt(limit), 100) : 20);
  }

  @Post('preview')
  @UseInterceptors(fileInterceptor())
  preview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Asnjë dokument nuk u ngarkua');
    return this.svc.previewColumns(file.buffer);
  }

  @Post('loans')
  @UseInterceptors(fileInterceptor())
  async importLoans(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Body('mapping') mappingRaw?: string,
    @Body('institution') institution?: string,
  ) {
    if (!file) throw new BadRequestException('Asnjë dokument nuk u ngarkua');
    let mapping: Record<string, string> | undefined;
    if (mappingRaw) {
      try { mapping = JSON.parse(mappingRaw); } catch { throw new BadRequestException('Mapping i pavlefshëm'); }
    }
    return this.svc.importFile(file.buffer, file.originalname, req.user.id, req.user.username, mapping, institution);
  }
}
