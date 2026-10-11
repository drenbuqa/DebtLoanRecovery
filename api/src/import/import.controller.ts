import {
  Controller, Post, Get, Delete, Param, Res, Request, Query, Body,
  UseInterceptors, UploadedFile,
  BadRequestException, NotFoundException, ForbiddenException, UseGuards, Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ImportService, ALL_FIELDS } from './import.service';
import { RolesGuard, RequireRoles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private svc: ImportService, private prisma: PrismaService) {}

  @Get('reference-data')
  async referenceData() {
    const [officers, institutions, cities] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true, role: { in: ['OFFICER', 'MANAGER', 'ADMIN'] } },
        select: { id: true, userCode: true, fullName: true, role: true, office: { select: { name: true, code: true } } },
        orderBy: { userCode: 'asc' },
      }),
      this.prisma.institution.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, shortName: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.city.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
    ]);
    return { officers, institutions, cities };
  }

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

  @Post('bulk-update')
  @UseInterceptors(fileInterceptor())
  async bulkUpdate(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Body('type') type: string,
  ) {
    if (!file) throw new BadRequestException('Asnjë dokument nuk u ngarkua');
    const validTypes = ['officer', 'institution', 'city'];
    if (!validTypes.includes(type)) throw new BadRequestException('Lloji i pavlefshëm');
    return this.svc.bulkUpdate(file.buffer, type as any, req.user.id);
  }

  @Get('jobs/:id/rollback-check')
  async rollbackCheck(@Param('id') id: string) {
    try {
      return await this.svc.rollbackCheck(id);
    } catch (e: any) {
      throw new NotFoundException(e.message);
    }
  }

  @Delete('jobs/:id')
  async rollback(@Param('id') id: string) {
    let check: any;
    try {
      check = await this.svc.rollbackCheck(id);
    } catch (e: any) {
      throw new NotFoundException(e.message);
    }
    if (!check.canRollback) throw new ForbiddenException(check.reason);
    return this.svc.rollback(id);
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
    // Start processing in background and return job ID immediately to avoid proxy timeouts
    const jobId = await this.svc.startImportJob(file.buffer, file.originalname, req.user.id, req.user.username, mapping, institution);
    return { jobId, status: 'PROCESSING' };
  }
}
