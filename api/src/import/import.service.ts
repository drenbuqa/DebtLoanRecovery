import { Injectable, BadRequestException } from '@nestjs/common';
import { ActivityType, ActivityOutcome, LoanPartyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as XLSX from 'xlsx';

// ── Column aliases ─────────────────────────────────────────────────────────────
// Maps any recognisable bank column name → our canonical key.
const COL_ALIASES: Record<string, string> = {
  // Personal ID
  'personal_id': 'personal_id', 'personalid': 'personal_id', 'id_number': 'personal_id',
  'id_nr': 'personal_id', 'nr_personal': 'personal_id', 'numri_personal': 'personal_id',
  'nid': 'personal_id', 'national_id': 'personal_id', 'ssn': 'personal_id',
  // Full name (combined — split during import)
  'full_name': 'full_name', 'fullname': 'full_name',
  'customer_name': 'full_name', 'client_name': 'full_name', 'debtor_name': 'full_name',
  'name_of_the_debtor': 'full_name', 'owners_name': 'full_name',
  'borrower_name': 'full_name', 'emri_mbiemri': 'full_name',
  // First / last name
  'first_name': 'first_name', 'firstname': 'first_name', 'emri': 'first_name',
  'last_name': 'last_name', 'lastname': 'last_name', 'mbiemri': 'last_name', 'surname': 'last_name',
  'family_name': 'last_name',
  // Phones
  'phone1': 'phone1', 'phone_1': 'phone1', 'phone': 'phone1', 'mobile': 'phone1',
  'tel': 'phone1', 'telefon': 'phone1', 'tel1': 'phone1', 'celular': 'phone1',
  'phone_nr': 'phone1', 'phone_number': 'phone1',
  'phone2': 'phone2', 'phone_2': 'phone2', 'tel2': 'phone2', 'alternative_phone': 'phone2',
  // Contact
  'address': 'address', 'adresa': 'address', 'addr': 'address', 'home_address': 'address',
  'city': 'city', 'qyteti': 'city', 'town': 'city', 'municipality': 'city',
  // Loan
  'loan_number': 'loan_number', 'loannumber': 'loan_number', 'loan_no': 'loan_number',
  'loan_id': 'loan_number', 'credit_number': 'loan_number', 'numri_kredise': 'loan_number',
  'contract_number': 'loan_number', 'agreement_number': 'loan_number', 'ref': 'loan_number',
  'ld_limit_number': 'loan_number', 'ld_limit_no': 'loan_number', 'limit_number': 'loan_number',
  // Institution
  'institution_name': 'institution_name', 'bank': 'institution_name', 'banka': 'institution_name',
  'lender': 'institution_name', 'creditor': 'institution_name', 'institution': 'institution_name',
  'bank_name': 'institution_name',
  // Amounts
  'original_loan_amount': 'original_loan_amount', 'original_amount': 'original_loan_amount',
  'loan_amount': 'original_loan_amount', 'principal': 'original_loan_amount',
  'shuma_origjinale': 'original_loan_amount', 'amount_approved': 'original_loan_amount',
  'approval_amount': 'original_loan_amount',
  'principal_amount': 'principal_amount', 'disbursed_amount': 'principal_amount',
  'disbursement_amount': 'principal_amount', 'amount_disbursed': 'principal_amount',
  'disb_amt': 'principal_amount',
  'current_outstanding_balance': 'current_outstanding_balance', 'outstanding_balance': 'current_outstanding_balance',
  'balance': 'current_outstanding_balance', 'remaining_balance': 'current_outstanding_balance',
  'current_balance': 'current_outstanding_balance', 'borxhi_aktual': 'current_outstanding_balance',
  'outstanding': 'current_outstanding_balance', 'due_amount': 'current_outstanding_balance',
  'outs_balance': 'current_outstanding_balance', 'outsbalance': 'current_outstanding_balance',
  // Currency / rate / product
  'currency': 'currency', 'monedha': 'currency', 'ccy': 'currency',
  'interest_rate': 'interest_rate', 'rate': 'interest_rate', 'norma_interesit': 'interest_rate',
  'product_type': 'product_type', 'product': 'product_type', 'loan_type': 'product_type',
  // Dates
  'disbursement_date': 'disbursement_date', 'issue_date': 'disbursement_date',
  'loan_date': 'disbursement_date', 'start_date': 'disbursement_date', 'data_disbursimit': 'disbursement_date',
  'last_payment_date': 'last_payment_date', 'last_payment': 'last_payment_date',
  'data_pageses_se_fundit': 'last_payment_date',
  // Office (DLR internal — only map explicit DLR office codes, never bank branch codes)
  'office_code': 'office_code', 'office': 'office_code',
  // DLR Officers — by UUID (preferred, exact)
  'assigned_officer_id': 'assigned_officer_id',
  'secondary_officer_id': 'secondary_officer_id',
  'dlr_officer_id': 'assigned_officer_id',
  'dlr_secondary_officer_id': 'secondary_officer_id',
  // DLR Officers — by name (fallback, fuzzy match)
  'dlr_first_collection_officer': 'assigned_officer_name',
  'dlr_second_collection_officer': 'secondary_officer_name',
  'collection_officer': 'assigned_officer_name',
  'first_collection_officer': 'assigned_officer_name',
  'second_collection_officer': 'secondary_officer_name',
  'zyrtari': 'assigned_officer_name',
  'zyrtari_kryesor': 'assigned_officer_name',
  'zyrtari_dytesor': 'secondary_officer_name',
  'zyrtari_i_pare': 'assigned_officer_name',
  'zyrtari_i_dyte': 'secondary_officer_name',
  // Guarantor 1
  'guarantor_personal_id': 'guarantor_personal_id',
  '1_guarantor_personal_id': 'guarantor_personal_id',
  'guarantor_id': 'guarantor_personal_id',
  'garanti_1_nid': 'guarantor_personal_id', 'garanti_nid': 'guarantor_personal_id',
  'guarantor_first_name': 'guarantor_first_name', 'guarantor_firstname': 'guarantor_first_name',
  'guarantor_last_name': 'guarantor_last_name', 'guarantor_lastname': 'guarantor_last_name',
  'guarantor_first_last_name': 'guarantor_full_name',
  '1_guarantor_first_last_name': 'guarantor_full_name',
  'garanti_1_emri_mbiemri': 'guarantor_full_name', 'garanti_emri_mbiemri': 'guarantor_full_name',
  'guarantor_phone': 'guarantor_phone', 'guarantor_tel': 'guarantor_phone',
  '1_guarantor_phone': 'guarantor_phone',
  'garanti_1_telefoni': 'guarantor_phone', 'garanti_telefoni': 'guarantor_phone',
  // Guarantor 2
  '2_guarantor_personal_id': 'guarantor2_personal_id',
  'guarantor2_personal_id': 'guarantor2_personal_id',
  'garanti_2_nid': 'guarantor2_personal_id',
  '2_guarantor_first_last_name': 'guarantor2_full_name',
  'guarantor2_first_last_name': 'guarantor2_full_name',
  'garanti_2_emri_mbiemri': 'guarantor2_full_name',
  '2_guarantor_phone': 'guarantor2_phone',
  'guarantor2_phone': 'guarantor2_phone',
  'garanti_2_telefoni': 'guarantor2_phone',
  // Co-borrower
  'co_borrower_personal_id': 'co_borrower_personal_id', 'coborrower_id': 'co_borrower_personal_id',
  'co_borrower_first_name': 'co_borrower_first_name', 'coborrower_firstname': 'co_borrower_first_name',
  'co_borrower_last_name': 'co_borrower_last_name', 'coborrower_lastname': 'co_borrower_last_name',
  'co_borrower_first_last_name': 'co_borrower_full_name',
  'coborrower_first_last_name': 'co_borrower_full_name',
  'co_borrower_phone': 'co_borrower_phone', 'coborrower_phone': 'co_borrower_phone',
  // Bank-specific known columns (from real exports)
  'owners_personal_id': 'personal_id',
  'cur_address': 'address', 'cur_town': 'city',
  'approval_date': 'disbursement_date',
  'principal_due_after_deduction_of_recoveries': 'current_outstanding_balance',
};

const REQUIRED_COLS = [
  'full_name',
  'loan_number', 'institution_name',
  'current_outstanding_balance',
];

interface ImportRow {
  personal_id: string;
  full_name: string;
  phone1?: string;
  phone2?: string;
  address?: string;
  city?: string;
  loan_number: string;
  institution_name: string;
  original_loan_amount?: string;
  principal_amount?: string;
  current_outstanding_balance: string;
  currency?: string;
  interest_rate?: string;
  product_type?: string;
  disbursement_date?: string;
  last_payment_date?: string;
  office_code?: string;
  assigned_officer_id?: string;
  secondary_officer_id?: string;
  assigned_officer_name?: string;
  secondary_officer_name?: string;
  // Guarantor 1 (individual or combined)
  guarantor_personal_id?: string;
  guarantor_full_name?: string;
  guarantor_first_name?: string;
  guarantor_last_name?: string;
  guarantor_phone?: string;
  // Guarantor 2
  guarantor2_personal_id?: string;
  guarantor2_full_name?: string;
  guarantor2_phone?: string;
  // Co-borrower
  co_borrower_personal_id?: string;
  co_borrower_full_name?: string;
  co_borrower_first_name?: string;
  co_borrower_last_name?: string;
  co_borrower_phone?: string;
  [key: string]: string | undefined;
}

// ── Parsers ────────────────────────────────────────────────────────────────────

function normaliseKey(k: string): string {
  // Strip BOM, trim, lowercase, collapse whitespace/dashes to underscore
  return k.replace(/^﻿/, '').trim().toLowerCase()
    .replace(/[\s\-\/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function resolveKey(raw: string): string {
  const norm = normaliseKey(raw);
  return COL_ALIASES[norm] ?? norm;
}

function parseDecimal(v: string | undefined): number {
  if (!v || String(v).trim() === '') return 0;
  // Handle European format: 1.234,56 → 1234.56
  let s = String(v).trim().replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // American/generic: strip thousands commas, keep decimal dot
    s = s.replace(/,(?=\d{3}(\.|$))/g, '');
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// DATE_FORMATS: try ISO first, then common regional formats
const DATE_REGEXES: { re: RegExp; parse: (m: RegExpMatchArray) => Date }[] = [
  // ISO: 2024-01-15
  { re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parse: m => new Date(+m[1], +m[2]-1, +m[3]) },
  // DD/MM/YYYY or DD-MM-YYYY
  { re: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, parse: m => new Date(+m[3], +m[2]-1, +m[1]) },
  // MM/DD/YYYY
  { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: m => new Date(+m[3], +m[1]-1, +m[2]) },
  // DD.MM.YY
  { re: /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/, parse: m => new Date(2000 + +m[3], +m[2]-1, +m[1]) },
  // Excel serial number (numeric string)
  { re: /^\d{5}$/, parse: m => {
    const d = new Date(Date.UTC(1899, 11, 30));
    d.setUTCDate(d.getUTCDate() + parseInt(m[0]));
    return d;
  }},
];

function parseDate(v: string | number | undefined): Date | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const s = String(v).trim();
  for (const { re, parse } of DATE_REGEXES) {
    const m = s.match(re);
    if (m) { const d = parse(m); if (!isNaN(d.getTime())) return d; }
  }
  // Fallback: JS native
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// Split "Agim Berisha" → { firstName: "Agim", lastName: "Berisha" }
// Handles "Ana Maria Berisha" → { firstName: "Ana Maria", lastName: "Berisha" }
function splitName(full: string | undefined): { firstName: string; lastName: string } | null {
  if (!full?.trim()) return null;
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

// Strip Excel's .0 suffix from numeric IDs: "1234567890.0" → "1234567890"
function cleanId(v: string | undefined): string {
  if (!v) return '';
  return String(v).trim().replace(/\.0+$/, '');
}


// ── Field metadata ─────────────────────────────────────────────────────────────

export const ALL_FIELDS: { key: string; label: string; required: boolean }[] = [
  // Required
  { key: 'personal_id',                 label: 'NID / Numri Personal',             required: false },
  { key: 'full_name',                   label: 'Emri Mbiemri',                      required: true },
  { key: 'loan_number',                 label: 'Numri i Kredisë',                   required: true },
  { key: 'institution_name',            label: 'Institucioni',                      required: true },
  { key: 'current_outstanding_balance', label: 'Balanca e Mbetur',                  required: true },
  // Personal info (optional)
  { key: 'phone1',                      label: 'Telefoni 1',                        required: false },
  { key: 'phone2',                      label: 'Telefoni 2',                        required: false },
  { key: 'address',                     label: 'Adresa',                            required: false },
  { key: 'city',                        label: 'Qyteti',                            required: false },
  // Loan amounts
  { key: 'original_loan_amount',        label: 'Shuma Origjinale',                  required: false },
  { key: 'principal_amount',            label: 'Shuma Principalit',                 required: false },
  // Loan details
  { key: 'product_type',                label: 'Lloji i Kredisë',                   required: false },
  { key: 'interest_rate',               label: 'Norma e Interesit',                 required: false },
  { key: 'currency',                    label: 'Valuta',                            required: false },
  // Dates
  { key: 'disbursement_date',           label: 'Data e Disbursimit',                required: false },
  { key: 'last_payment_date',           label: 'Data e Pagesës së Fundit',          required: false },
  // Assignment
  { key: 'office_code',                 label: 'Kodi i Zyrës',                      required: false },
  { key: 'assigned_officer_name',       label: 'Oficeri i Parë i Mbledhjes (DLR)',  required: false },
  { key: 'secondary_officer_name',      label: 'Oficeri i Dytë i Mbledhjes (DLR)', required: false },
  // Guarantor 1
  { key: 'guarantor_personal_id',       label: 'Garanti 1 – NID',                  required: false },
  { key: 'guarantor_full_name',         label: 'Garanti 1 – Emri Mbiemri',         required: false },
  { key: 'guarantor_phone',             label: 'Garanti 1 – Telefoni',             required: false },
  // Guarantor 2
  { key: 'guarantor2_personal_id',      label: 'Garanti 2 – NID',                  required: false },
  { key: 'guarantor2_full_name',        label: 'Garanti 2 – Emri Mbiemri',         required: false },
  { key: 'guarantor2_phone',            label: 'Garanti 2 – Telefoni',             required: false },
  // Co-borrower
  { key: 'co_borrower_personal_id',     label: 'Ko-huamarrësi – NID',              required: false },
  { key: 'co_borrower_full_name',       label: 'Ko-huamarrësi – Emri Mbiemri',     required: false },
  { key: 'co_borrower_phone',           label: 'Ko-huamarrësi – Telefoni',         required: false },
];

// ── Preview types ──────────────────────────────────────────────────────────────

export interface ColumnMapping {
  original: string;        // bank's original column header
  mapped: string | null;   // our canonical key, or null
  confidence: 'auto' | 'none';
}

export interface PreviewResult {
  totalRows: number;
  columns: ColumnMapping[];
  requiredMissing: string[];  // canonical keys of required fields not yet mapped
  sampleValues: Record<string, string>;  // first data row: original_col → value
  needsInstitution: boolean;  // true when no institution column was detected
}

// ── Result types ───────────────────────────────────────────────────────────────

export interface ImportResult {
  jobId: string;
  fileName: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: { row: number; loan_number: string; error: string }[];
}

export interface ImportJob {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  createdAt: Date;
  completedAt: Date | null;
  uploadedBy: { fullName: string };
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  templateXlsx(): Buffer {
    const headers = [
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'collection_officer', 'second_collection_officer',
      'original_loan_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'last_payment_date',
      'office_code',
      '1_guarantor_personal_id', '1_guarantor_first_last_name', '1_guarantor_phone',
      '2_guarantor_personal_id', '2_guarantor_first_last_name', '2_guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
    ];
    const example = [
      '1234567890', 'Arben Gashi',
      '+38344123456', '', 'Rruga Nene Tereza 12', 19,
      'PCB-2024-001', 9,
      1, '',
      15000, 12500,
      'Consumer', '2024-01-15', '2024-11-01',
      'PRK',
      '9876543210', 'Vjosa Berisha', '+38344654321',
      '', 'Agron Berisha', '+38344654322',
      '', '', '',
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    // Column widths
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));

    XLSX.utils.book_append_sheet(wb, ws, 'Import');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  private friendlyImportError(raw: string): string {
    if (raw.includes('too long for the column') || raw.includes('value too long')) {
      if (raw.includes('personPhone') || raw.includes('phone')) {
        return 'Numri i telefonit është shumë i gjatë (maks. 30 karaktere). Kontrolloni kolonat e telefonit.';
      }
      if (raw.includes('person')) {
        return 'Një fushë e personit (emri ose ID) është shumë e gjatë. Kontrolloni të dhënat e klientit.';
      }
      return 'Një vlerë në këtë rresht është shumë e gjatë për bazën e të dhënave. Shkurtoni vlerën dhe provoni përsëri.';
    }
    if (raw.includes('Unique constraint') || raw.includes('unique constraint')) {
      return 'Ky klient ose kredi ekziston tashmë në sistem.';
    }
    if (raw.includes('Foreign key constraint') || raw.includes('foreign key')) {
      return 'Institucioni ose zyrtari i specifikuar nuk ekziston në sistem.';
    }
    if (raw.includes('prisma.') || raw.includes('Invalid `prisma')) {
      return 'Gabim gjatë ruajtjes së të dhënave. Kontrolloni formatin e rreshtit.';
    }
    return raw;
  }

  async listJobs(limit = 20): Promise<any[]> {
    const jobs = await this.prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, fileName: true, status: true,
        totalRows: true, successfulRows: true, failedRows: true,
        createdAt: true, completedAt: true,
        uploadedBy: { select: { fullName: true } },
        errors: { select: { rowNumber: true, errorMessage: true }, take: 100 },
      },
    });
    return jobs.map(j => ({
      ...j,
      skippedRows: j.totalRows - j.successfulRows - j.failedRows,
    }));
  }

  previewColumns(buffer: Buffer): PreviewResult {
    let raw: any[];
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    } catch (e: any) {
      throw new BadRequestException(`Dokumenti nuk mund të lexohet: ${e.message}`);
    }

    if (raw.length === 0) throw new BadRequestException('Dokumenti nuk ka rreshta me të dhëna');

    const originalHeaders = Object.keys(raw[0]);
    const firstDataRow = raw[0];

    const columns: ColumnMapping[] = originalHeaders.map(h => {
      const resolved = resolveKey(h);
      // resolved equals the canonical key only if it exists in ALL_FIELDS
      const knownField = ALL_FIELDS.find(f => f.key === resolved);
      return {
        original: h,
        mapped: knownField ? resolved : null,
        confidence: knownField ? 'auto' : 'none',
      };
    });

    const mappedKeys = new Set(columns.filter(c => c.mapped).map(c => c.mapped as string));

    const requiredMissing = REQUIRED_COLS.filter(k => !mappedKeys.has(k));

    const sampleValues: Record<string, string> = {};
    for (const h of originalHeaders) {
      sampleValues[h] = String(firstDataRow[h] ?? '').trim().slice(0, 60);
    }

    return {
      totalRows: raw.length - 1,
      columns,
      requiredMissing,
      sampleValues,
      needsInstitution: !mappedKeys.has('institution_name'),
    };
  }

  async startImportJob(
    buffer: Buffer,
    fileName: string,
    importedById: string,
    importedByUsername: string,
    columnOverrides?: Record<string, string>,
    institutionOverride?: string,
  ): Promise<string> {
    // Parse and validate synchronously so we can reject bad files immediately
    let rows: ImportRow[];
    try {
      rows = this.parseFile(buffer, columnOverrides);
    } catch (e: any) {
      throw new BadRequestException(`Dokumenti nuk mund të lexohet: ${e.message}`);
    }
    if (rows.length === 0) throw new BadRequestException('Dokumenti nuk ka rreshta me të dhëna');
    if (rows.length > 50000) throw new BadRequestException('Maksimumi i lejuar është 50,000 rreshta për import');

    // Create job record upfront
    const job = await this.prisma.importJob.create({
      data: {
        uploadedById: importedById,
        importType: 'PORTFOLIO',
        fileName,
        status: 'PROCESSING',
        totalRows: rows.length,
        startedAt: new Date(),
      },
    });

    // Process in background — do not await
    setImmediate(() => {
      this.processImport(rows, fileName, importedById, importedByUsername, job.id, columnOverrides, institutionOverride)
        .catch(async (e) => {
          await this.prisma.importJob.update({
            where: { id: job.id },
            data: { status: 'FAILED', completedAt: new Date() },
          }).catch(() => {});
        });
    });

    return job.id;
  }

  async importFile(
    buffer: Buffer,
    fileName: string,
    importedById: string,
    importedByUsername: string,
    columnOverrides?: Record<string, string>,
    institutionOverride?: string,
  ): Promise<ImportResult> {
    let rows: ImportRow[];
    try {
      rows = this.parseFile(buffer, columnOverrides);
    } catch (e: any) {
      throw new BadRequestException(`Dokumenti nuk mund të lexohet: ${e.message}`);
    }

    if (rows.length === 0) throw new BadRequestException('Dokumenti nuk ka rreshta me të dhëna');
    if (rows.length > 50000) throw new BadRequestException('Maksimumi i lejuar është 50,000 rreshta për import');

    this.prepareRows(rows, institutionOverride);
    this.validateRequiredCols(rows);

    const job = await this.prisma.importJob.create({
      data: {
        uploadedById: importedById,
        importType: 'PORTFOLIO',
        fileName,
        status: 'PROCESSING',
        totalRows: rows.length,
        startedAt: new Date(),
      },
    });

    await this.processImport(rows, fileName, importedById, importedByUsername, job.id, columnOverrides, institutionOverride);

    const finished = await this.prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
    const skipped = finished.totalRows - finished.successfulRows - finished.failedRows;
    const errorRows = await this.prisma.importError.findMany({ where: { importJobId: job.id }, select: { rowNumber: true, errorMessage: true }, take: 100 });
    return {
      jobId: job.id,
      fileName,
      total: finished.totalRows,
      succeeded: finished.successfulRows,
      failed: finished.failedRows,
      skipped,
      errors: errorRows.map(e => ({ row: e.rowNumber, loan_number: '', error: e.errorMessage })),
    };
  }

  private parseFile(buffer: Buffer, overrides?: Record<string, string>): ImportRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    const seenKeys = new Set<string>();
    return raw.map(r => {
      const out: any = {};
      seenKeys.clear();
      for (const [k, v] of Object.entries(r)) {
        // Manual override takes priority, then alias map
        const resolved = overrides?.[k] ?? resolveKey(k);
        if (resolved === '__ignore__') continue;
        // Skip duplicate columns — Excel appends _1, _2 to repeated headers
        if (seenKeys.has(resolved)) continue;
        seenKeys.add(resolved);
        const str = String(v ?? '').trim();
        // Treat "0" as empty for non-numeric fields (bank exports zeros for missing data)
        const isNumericField = ['current_outstanding_balance','original_loan_amount','principal_amount','interest_rate'].includes(resolved);
        out[resolved] = (!isNumericField && str === '0') ? '' : str;
      }
      return out;
    });
  }

  // ── Bulk partial update ────────────────────────────────────────────────────────

  // Reference data loaded from DB — no hardcoded maps

  // ── Import rollback ────────────────────────────────────────────────────────────

  async rollbackCheck(jobId: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      select: { id: true, fileName: true, successfulRows: true, completedAt: true, cases: { select: { id: true, caseReference: true } } },
    });
    if (!job) throw new Error('Importi nuk u gjet');

    const caseIds = job.cases.map((c) => c.id);
    if (caseIds.length === 0) {
      return {
        canRollback: false,
        reason: 'Ky import u krye para se sistemi të fillonte të gjurmonte lidhjen midis importeve dhe rasteve. Anulimi automatik nuk është i mundshëm për importet e vjetra.',
        blockers: [],
      };
    }

    // Check for any follow-up data on these cases
    const [activities, payments, agreements, legalProceedings, documents] = await Promise.all([
      this.prisma.activity.count({ where: { caseId: { in: caseIds } } }),
      this.prisma.payment.count({ where: { caseId: { in: caseIds } } }),
      this.prisma.agreement.count({ where: { caseId: { in: caseIds } } }),
      this.prisma.legalProceeding.count({ where: { caseId: { in: caseIds } } }),
      this.prisma.document.count({ where: { caseId: { in: caseIds } } }),
    ]);

    const blockers: string[] = [];
    if (activities > 0)       blockers.push(`${activities} aktivitet${activities !== 1 ? 'e' : ''}`);
    if (payments > 0)         blockers.push(`${payments} pagesë${payments !== 1 ? '' : ''}`);
    if (agreements > 0)       blockers.push(`${agreements} marrëveshje`);
    if (legalProceedings > 0) blockers.push(`${legalProceedings} procedurë ligjore`);
    if (documents > 0)        blockers.push(`${documents} dokument${documents !== 1 ? 'e' : ''}`);

    if (blockers.length > 0) {
      return {
        canRollback: false,
        reason: `Rastet e këtij importi kanë të dhëna të regjistruara: ${blockers.join(', ')}. Fshirja do të shkatërronte këto të dhëna.`,
        blockers,
        caseCount: caseIds.length,
      };
    }

    return {
      canRollback: true,
      reason: null,
      caseCount: caseIds.length,
      cases: job.cases.map((c) => c.caseReference),
    };
  }

  async rollback(jobId: string) {
    const check = await this.rollbackCheck(jobId);
    if (!check.canRollback) throw new Error(check.reason ?? 'Rollback i bllokuar');

    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      select: { cases: { select: { id: true, loanId: true, loan: { select: { borrowerId: true } } } } },
    });
    if (!job) throw new Error('Importi nuk u gjet');

    const caseIds  = job.cases.map((c) => c.id);
    const loanIds  = job.cases.map((c) => c.loanId);
    const borrowerIds = [...new Set(job.cases.map((c) => c.loan.borrowerId))];

    await this.prisma.$transaction(async (tx) => {
      // Delete in dependency order
      await tx.loanParty.deleteMany({ where: { loanId: { in: loanIds } } });
      await tx.loanBalanceHistory.deleteMany({ where: { loanId: { in: loanIds } } });
      await tx.case.deleteMany({ where: { id: { in: caseIds } } });
      await tx.loan.deleteMany({ where: { id: { in: loanIds } } });
      // Only delete persons not referenced by other loans
      for (const borrowerId of borrowerIds) {
        const otherLoans = await tx.loan.count({ where: { borrowerId } });
        if (otherLoans === 0) {
          await tx.personPhone.deleteMany({ where: { personId: borrowerId } });
          await tx.person.deleteMany({ where: { id: borrowerId } });
        }
      }
      // Mark job as rolled back
      await tx.importJob.update({ where: { id: jobId }, data: { status: 'FAILED' } });
    });

    return { deleted: caseIds.length };
  }

  // ── Bulk partial update ────────────────────────────────────────────────────────

  async bulkUpdate(buffer: Buffer, type: 'officer'|'secondary_officer'|'npl'|'institution'|'city'|'category'|'balance'|'phone2'|'office'|'guarantor1'|'guarantor2', performedById: string) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Skip header row if first cell looks like a header
    const dataRows = rows.filter((r, i) => {
      if (i === 0) {
        const first = String(r[0] ?? '').toLowerCase();
        return !['case', 'rasti', 'reference', 'nr', 'numri'].some(h => first.includes(h));
      }
      return true;
    });

    let updated = 0, skipped = 0;
    const errors: string[] = [];

    // Pre-load lookups from DB (by numeric code)
    let institutionByCode: Map<number, string> | null = null;
    if (type === 'institution') {
      const insts = await this.prisma.institution.findMany({ select: { id: true, code: true } });
      institutionByCode = new Map(insts.map((i) => [i.code, i.id]));
    }

    let officerByCode: Map<number, string> | null = null;
    if (type === 'officer' || type === 'secondary_officer') {
      const officers = await this.prisma.user.findMany({
        where: { isActive: true, role: { in: ['OFFICER', 'MANAGER', 'ADMIN'] as any[] } },
        select: { id: true, userCode: true },
      });
      officerByCode = new Map(officers.map((o) => [o.userCode, o.id]));
    }

    let cityByCode: Map<number, string> | null = null;
    if (type === 'city') {
      const cities = await this.prisma.city.findMany({ select: { code: true, name: true } });
      cityByCode = new Map(cities.map((c) => [c.code, c.name]));
    }

    let officeByCode: Map<string, string> | null = null;
    if (type === 'office') {
      const offices = await this.prisma.office.findMany({ select: { id: true, code: true } });
      officeByCode = new Map(offices.map((o) => [o.code.toLowerCase(), o.id]));
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const caseRef = String(row[0] ?? '').trim();
      const codeRaw = String(row[1] ?? '').trim();
      const rowLabel = `Rreshti ${i + 2}`;

      if (!caseRef || !codeRaw) { skipped++; continue; }

      try {
        const cas = await this.prisma.case.findUnique({
          where: { caseReference: caseRef },
          select: { id: true, loanId: true, loan: { select: { borrowerId: true } } },
        });
        if (!cas) { errors.push(`${rowLabel}: rasti "${caseRef}" nuk u gjet`); skipped++; continue; }

        if (type === 'officer') {
          const code = parseInt(codeRaw);
          const officerId = officerByCode!.get(code);
          if (!officerId) { errors.push(`${rowLabel}: kodi i zyrtatit ${code} nuk ekziston`); skipped++; continue; }
          await this.prisma.case.update({ where: { id: cas.id }, data: { assignedOfficerId: officerId } });
          updated++;
        } else if (type === 'secondary_officer') {
          const code = parseInt(codeRaw);
          const officerId = officerByCode!.get(code);
          if (!officerId) { errors.push(`${rowLabel}: kodi i zyrtatit dytësor ${code} nuk ekziston`); skipped++; continue; }
          await this.prisma.case.update({ where: { id: cas.id }, data: { secondaryOfficerId: officerId } });
          updated++;
        } else if (type === 'category') {
          const val = codeRaw.toUpperCase();
          const valid = ['D1', 'D2', 'D3', 'D4', 'LEGAL'];
          if (!valid.includes(val)) { errors.push(`${rowLabel}: kategoria "${codeRaw}" nuk është e vlefshme (D1-D4, LEGAL)`); skipped++; continue; }
          await this.prisma.case.update({ where: { id: cas.id }, data: { collectionStage: val as any } });
          updated++;
        } else if (type === 'balance') {
          const amount = parseFloat(codeRaw);
          if (isNaN(amount) || amount < 0) { errors.push(`${rowLabel}: borgji "${codeRaw}" nuk është numër valid`); skipped++; continue; }
          if (!cas.loanId) { errors.push(`${rowLabel}: rasti "${caseRef}" nuk ka kredi`); skipped++; continue; }
          await this.prisma.loan.update({ where: { id: cas.loanId }, data: { currentOutstandingBalance: amount } });
          updated++;
        } else if (type === 'phone2') {
          if (!cas.loan?.borrowerId) { errors.push(`${rowLabel}: rasti "${caseRef}" nuk ka huamarrës`); skipped++; continue; }
          const existing = await this.prisma.personPhone.findFirst({
            where: { personId: cas.loan.borrowerId, isPrimary: false, isActive: true },
          });
          if (existing) {
            await this.prisma.personPhone.update({ where: { id: existing.id }, data: { phoneNumber: codeRaw } });
          } else {
            await this.prisma.personPhone.create({ data: { personId: cas.loan.borrowerId, phoneNumber: codeRaw, isPrimary: false, isActive: true } });
          }
          updated++;
        } else if (type === 'institution') {
          const code = parseInt(codeRaw);
          const instId = institutionByCode!.get(code);
          if (!instId) { errors.push(`${rowLabel}: kodi i institucionit ${code} nuk ekziston`); skipped++; continue; }
          await this.prisma.loan.update({ where: { id: cas.loanId }, data: { institutionId: instId } });
          updated++;
        } else if (type === 'city') {
          const code = parseInt(codeRaw);
          const cityName = cityByCode!.get(code);
          if (!cityName) { errors.push(`${rowLabel}: kodi i qytetit ${code} nuk ekziston`); skipped++; continue; }
          await this.prisma.person.update({ where: { id: cas.loan.borrowerId }, data: { city: cityName } });
          updated++;
        } else if (type === 'office') {
          const officeId = officeByCode!.get(codeRaw.toLowerCase());
          if (!officeId) { errors.push(`${rowLabel}: kodi i zyrës "${codeRaw}" nuk ekziston`); skipped++; continue; }
          await this.prisma.case.update({ where: { id: cas.id }, data: { officeId } });
          updated++;
        } else if (type === 'guarantor1' || type === 'guarantor2') {
          const fullName = codeRaw.trim();
          const phone = String(row[2] ?? '').trim();
          if (!fullName) { skipped++; continue; }
          const guarantorIndex = type === 'guarantor1' ? 0 : 1;
          const safeFullName = fullName.slice(0, 200);
          const loanParties = await this.prisma.loanParty.findMany({
            where: { loanId: cas.loanId, role: 'GUARANTOR' },
            orderBy: { createdAt: 'asc' },
            select: { id: true, personId: true },
          });
          if (loanParties[guarantorIndex]) {
            const personId = loanParties[guarantorIndex].personId;
            await this.prisma.person.update({ where: { id: personId }, data: { fullName: safeFullName } });
            if (phone) {
              const ph = phone.slice(0, 30);
              const existing = await this.prisma.personPhone.findFirst({ where: { personId, isPrimary: true } });
              if (existing) {
                await this.prisma.personPhone.update({ where: { id: existing.id }, data: { phoneNumber: ph } });
              } else {
                await this.prisma.personPhone.create({ data: { personId, phoneNumber: ph, phoneType: 'MOBILE', isPrimary: true } });
              }
            }
          } else {
            const syntheticId = `NOID-G${guarantorIndex + 1}-${cas.loanId.slice(0, 10)}`.slice(0, 30);
            const person = await this.prisma.person.upsert({
              where: { personalId: syntheticId },
              create: { personalId: syntheticId, fullName: safeFullName },
              update: { fullName: safeFullName },
            });
            if (phone) {
              const ph = phone.slice(0, 30);
              const exists = await this.prisma.personPhone.findFirst({ where: { personId: person.id, phoneNumber: ph } });
              if (!exists) await this.prisma.personPhone.create({ data: { personId: person.id, phoneNumber: ph, phoneType: 'MOBILE', isPrimary: true } });
            }
            await this.prisma.loanParty.createMany({ data: [{ loanId: cas.loanId, personId: person.id, role: 'GUARANTOR' }], skipDuplicates: true });
          }
          updated++;
        }
      } catch (e: any) {
        errors.push(`${rowLabel}: ${e.message}`);
        skipped++;
      }
    }

    return { updated, skipped, errors, total: dataRows.length };
  }

  private prepareRows(rows: ImportRow[], institutionOverride?: string) {
    if (institutionOverride?.trim()) {
      for (const row of rows) {
        if (!row.institution_name?.trim()) row.institution_name = institutionOverride.trim();
      }
    }
    for (const row of rows) {
      if (!row.full_name?.trim() && ((row as any).first_name || (row as any).last_name)) {
        const fn = ((row as any).first_name ?? '').trim();
        const ln = ((row as any).last_name ?? '').trim();
        row.full_name = (fn + (ln ? ' ' + ln : '')).trim();
      }
    }
  }

  private validateRequiredCols(rows: ImportRow[]) {
    const firstRowKeys = Object.keys(rows[0]);
    const missing = REQUIRED_COLS.filter(k => !firstRowKeys.includes(k));
    if (missing.length) {
      const labels = missing.map(k => ALL_FIELDS.find(f => f.key === k)?.label ?? k);
      throw new BadRequestException(`Kolona të detyrueshme mungojnë: ${labels.join(', ')}.`);
    }
  }

  private async processImport(
    rows: ImportRow[],
    fileName: string,
    importedById: string,
    importedByUsername: string,
    jobId: string,
    _columnOverrides?: Record<string, string>,
    institutionOverride?: string,
  ): Promise<void> {
    this.prepareRows(rows, institutionOverride);

    const errors: { row: number; loan_number: string; error: string }[] = [];
    let succeeded = 0, failed = 0, skipped = 0;

    const institutions = await this.prisma.institution.findMany({ select: { id: true, name: true, shortName: true, code: true } });
    const instByCode = new Map(institutions.map(i => [i.code, i]));
    const instByName = new Map(institutions.map(i => [i.name.toLowerCase().trim(), i]));
    const offices = await this.prisma.office.findMany({ select: { id: true, code: true } });
    const officeMap = new Map(offices.map(o => [o.code.toLowerCase(), o]));
    const officers = await this.prisma.user.findMany({ select: { id: true, fullName: true, userCode: true } });
    const officerMap = new Map(officers.map(o => [o.fullName.toLowerCase().trim(), o.id]));
    const officerFirstNameMap = new Map(officers.map(o => [o.fullName.toLowerCase().trim().split(/\s+/)[0], o.id]));
    const officerIdSet = new Set(officers.map(o => o.id));
    const officerByCode = new Map(officers.map(o => [o.userCode, o.id]));
    const cities = await this.prisma.city.findMany({ select: { code: true, name: true } });
    const cityByCode = new Map(cities.map(c => [c.code, c.name]));

    // Pre-load all existing loan numbers in one query instead of per-row lookups
    const existingLoanNumbers = new Set(
      (await this.prisma.loan.findMany({ select: { loanNumber: true } })).map(l => l.loanNumber),
    );

    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const loanNum = cleanId(row.loan_number) || `row-${rowNum}`;

      // Yield to event loop between chunks to keep memory stable and server responsive
      if (i > 0 && i % CHUNK_SIZE === 0) {
        await new Promise<void>(r => setImmediate(r));
      }

      // Save progress every 100 rows so the UI stays current and a crash is recoverable
      if (i > 0 && i % 100 === 0) {
        await this.prisma.importJob.update({
          where: { id: jobId },
          data: { successfulRows: succeeded, failedRows: failed },
        }).catch(() => {});
      }

      try {
        this.validateRow(row, rowNum);

        if (existingLoanNumbers.has(loanNum)) { skipped++; continue; }

        const instRaw = row.institution_name?.trim() ?? '';
        const instCode = parseInt(instRaw);
        let institution: { id: string; name: string; shortName: string } | undefined;
        if (!isNaN(instCode) && String(instCode) === instRaw) {
          institution = instByCode.get(instCode);
        }
        if (!institution) institution = instByName.get(instRaw.toLowerCase());
        if (!institution) {
          const name = instRaw || 'Unknown';
          const created = await this.prisma.institution.create({
            data: { name, shortName: name.slice(0, 20) },
            select: { id: true, name: true, shortName: true, code: true },
          });
          institution = created;
          instByCode.set(created.code, created);
          instByName.set(created.name.toLowerCase().trim(), created);
        }

        const officeCode = row.office_code?.trim().toLowerCase();
        const office = officeCode ? officeMap.get(officeCode) : undefined;

        const resolveOfficer = (id: string | undefined, name: string | undefined) => {
          const val = (id ?? name ?? '').trim();
          if (!val) return undefined;
          const codeNum = parseInt(val);
          if (!isNaN(codeNum) && String(codeNum) === val) {
            const byCode = officerByCode.get(codeNum);
            if (byCode) return byCode;
          }
          if (officerIdSet.has(val)) return val;
          const key = val.toLowerCase();
          return officerMap.get(key) ?? officerFirstNameMap.get(key.split(/\s+/)[0]) ?? undefined;
        };
        const assignedOfficerId  = resolveOfficer(row.assigned_officer_id, row.assigned_officer_name);
        const secondaryOfficerId = resolveOfficer(row.secondary_officer_id, row.secondary_officer_name);

        await this.prisma.$transaction(async (tx) => {
          const personalId = (cleanId(row.personal_id) || `NOID-${loanNum}`).slice(0, 30);
          const fullName = (row.full_name?.trim() || '').slice(0, 200);

          let cityVal = row.city?.trim() || undefined;
          if (cityVal) {
            const cityCode = parseInt(cityVal);
            if (!isNaN(cityCode) && String(cityCode) === cityVal) {
              cityVal = cityByCode.get(cityCode) ?? cityVal;
            }
          }

          const borrower = await tx.person.upsert({
            where: { personalId },
            create: { personalId, fullName, address: row.address?.trim() || undefined, city: cityVal },
            update: { fullName, ...(row.address?.trim() && { address: row.address.trim() }), ...(cityVal && { city: cityVal }) },
          });

          for (const [phone, isPrimary] of [[row.phone1?.trim(), true], [row.phone2?.trim(), false]] as [string | undefined, boolean][]) {
            if (phone) {
              const phoneNum = phone.slice(0, 30);
              const exists = await tx.personPhone.findFirst({ where: { personId: borrower.id, phoneNumber: phoneNum } });
              if (!exists) await tx.personPhone.create({ data: { personId: borrower.id, phoneNumber: phoneNum, phoneType: 'MOBILE', isPrimary } });
            }
          }

          const principalAmt = parseDecimal(row.principal_amount || row.original_loan_amount);
          const originalAmt  = parseDecimal(row.original_loan_amount || row.principal_amount);

          const loan = await tx.loan.create({
            data: {
              loanNumber: loanNum,
              institutionId: institution!.id,
              borrowerId: borrower.id,
              originalLoanAmount: originalAmt,
              disbursedAmount: principalAmt || originalAmt,
              currentOutstandingBalance: parseDecimal(row.current_outstanding_balance),
              currency: row.currency?.trim().toUpperCase() || 'EUR',
              interestRate: row.interest_rate ? parseDecimal(row.interest_rate) : undefined,
              productType: row.product_type?.trim() || undefined,
              disbursementDate: parseDate(row.disbursement_date) ?? undefined,
              lastPaymentDate: parseDate(row.last_payment_date),
            },
          });

          await tx.loanParty.create({ data: { loanId: loan.id, personId: borrower.id, role: 'BORROWER' } });

          const upsertParty = async (rawId: string | undefined, rawFullName: string | undefined, rawFirstName: string | undefined, rawLastName: string | undefined, rawPhone: string | undefined, role: LoanPartyRole, syntheticIdSuffix?: string) => {
            let pid = cleanId(rawId);
            let fName = rawFirstName?.trim() || '';
            let lName = rawLastName?.trim() || '';
            if (!fName && rawFullName) { const split = splitName(rawFullName); fName = split?.firstName ?? ''; lName = split?.lastName ?? ''; }
            if (!fName) return;
            if (!pid) pid = `NOID-${role}-${loanNum}-${syntheticIdSuffix ?? '1'}`;
            const safePid = pid.slice(0, 30);
            const safeFullName = (fName + (lName ? ' ' + lName : '')).trim().slice(0, 200);
            const person = await tx.person.upsert({ where: { personalId: safePid }, create: { personalId: safePid, fullName: safeFullName }, update: { fullName: safeFullName } });
            if (rawPhone?.trim()) {
              const ph = rawPhone.trim().slice(0, 30);
              const exists = await tx.personPhone.findFirst({ where: { personId: person.id, phoneNumber: ph } });
              if (!exists) await tx.personPhone.create({ data: { personId: person.id, phoneNumber: ph, phoneType: 'MOBILE', isPrimary: true } });
            }
            await tx.loanParty.createMany({ data: [{ loanId: loan.id, personId: person.id, role }], skipDuplicates: true });
          };

          await upsertParty(row.guarantor_personal_id, row.guarantor_full_name, row.guarantor_first_name, row.guarantor_last_name, row.guarantor_phone, 'GUARANTOR', '1');
          await upsertParty(row.guarantor2_personal_id, row.guarantor2_full_name, undefined, undefined, row.guarantor2_phone, 'GUARANTOR', '2');
          await upsertParty(row.co_borrower_personal_id, row.co_borrower_full_name, row.co_borrower_first_name, row.co_borrower_last_name, row.co_borrower_phone, 'CO_BORROWER', '1');

          const year = new Date().getFullYear();
          const caseRef = `DLR-${year}-${loan.id.slice(0, 6).toUpperCase()}`;
          await tx.case.create({
            data: { caseReference: caseRef, loanId: loan.id, officeId: office?.id, assignedOfficerId: assignedOfficerId ?? undefined, secondaryOfficerId: secondaryOfficerId ?? undefined, importJobId: jobId, status: 'ACTIVE', collectionStage: 'D1' },
          });
        });

        // Track newly inserted loan numbers so in-file duplicates are caught without a DB query
        existingLoanNumbers.add(loanNum);
        succeeded++;
      } catch (e: any) {
        failed++;
        const raw = e.message ?? String(e);
        const msg = this.friendlyImportError(raw);
        errors.push({ row: rowNum, loan_number: loanNum, error: msg });
        await this.prisma.importError.create({
          data: { importJobId: jobId, rowNumber: rowNum, errorMessage: msg, rawData: JSON.stringify(rows[i]) },
        }).catch(() => {});
      }
    }

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { status: failed === rows.length ? 'FAILED' : 'COMPLETED', successfulRows: succeeded, failedRows: failed, totalRows: rows.length, completedAt: new Date() },
    });

    await this.audit.log({
      userId: importedById,
      username: importedByUsername,
      action: 'LOAN_IMPORT',
      entity: 'Loan',
      details: `Import "${fileName}": ${succeeded} sukses, ${failed} gabime, ${skipped} anashkaluar nga ${rows.length} gjithsej`,
    });
  }

  // ── Activity type alias map ────────────────────────────────────────────────────
  private static readonly ACTIVITY_TYPE_ALIASES: Record<string, string> = {
    call: 'CALL', telefonatë: 'CALL', telefonata: 'CALL', tel: 'CALL',
    visit: 'VISIT', vizitë: 'VISIT', vizita: 'VISIT',
    sms: 'SMS',
    email: 'EMAIL', 'e-mail': 'EMAIL',
    letter: 'LETTER', letër: 'LETTER', letra: 'LETTER',
    promise_to_pay: 'PROMISE_TO_PAY', premtim: 'PROMISE_TO_PAY', premtimpages: 'PROMISE_TO_PAY',
    payment_received: 'PAYMENT_RECEIVED', pagesa: 'PAYMENT_RECEIVED', payment: 'PAYMENT_RECEIVED',
    legal_action: 'LEGAL_ACTION', ligjore: 'LEGAL_ACTION', legal: 'LEGAL_ACTION',
    note: 'NOTE', shënim: 'NOTE', shenium: 'NOTE',
    field_visit: 'FIELD_VISIT', vizitëtereni: 'FIELD_VISIT',
    call_borrower: 'CALL_BORROWER', call_guarantor: 'CALL_GUARANTOR',
    visit_borrower: 'VISIT_BORROWER', visit_guarantor: 'VISIT_GUARANTOR',
    warning_letter: 'WARNING_LETTER', letërvërejtje: 'WARNING_LETTER',
    meeting_borrower: 'MEETING_BORROWER', meeting_guarantor: 'MEETING_GUARANTOR',
  };

  private static readonly ACTIVITY_OUTCOME_ALIASES: Record<string, string> = {
    contacted: 'CONTACTED', kontaktuar: 'CONTACTED',
    no_answer: 'NO_ANSWER', s_ka_përgjigjur: 'NO_ANSWER', nopërgjigjje: 'NO_ANSWER',
    promise_received: 'PROMISE_RECEIVED', premtim: 'PROMISE_RECEIVED',
    refused: 'REFUSED', refuzuar: 'REFUSED',
    partial_payment: 'PARTIAL_PAYMENT', pagesëpjesshme: 'PARTIAL_PAYMENT',
    full_payment: 'FULL_PAYMENT', pagesëplote: 'FULL_PAYMENT',
    dispute: 'DISPUTE', mosmarrëveshje: 'DISPUTE',
    deceased: 'DECEASED', vdekur: 'DECEASED',
    other: 'OTHER', tjetër: 'OTHER',
  };

  private resolveActivityType(raw: string): string | null {
    if (!raw?.trim()) return null;
    const norm = raw.trim().toLowerCase().replace(/[\s\-\/]+/g, '_').replace(/[^a-zëç0-9_]/g, '');
    const alias = ImportService.ACTIVITY_TYPE_ALIASES[norm];
    if (alias) return alias;
    const upper = raw.trim().toUpperCase();
    const valid = ['CALL','VISIT','SMS','EMAIL','LETTER','PROMISE_TO_PAY','PAYMENT_RECEIVED','LEGAL_ACTION','NOTE','FIELD_VISIT','CALL_BORROWER','CALL_GUARANTOR','VISIT_BORROWER','VISIT_GUARANTOR','WARNING_LETTER','MEETING_BORROWER','MEETING_GUARANTOR'];
    return valid.includes(upper) ? upper : null;
  }

  private resolveActivityOutcome(raw: string): string | null {
    if (!raw?.trim()) return null;
    const norm = raw.trim().toLowerCase().replace(/[\s\-\/]+/g, '_').replace(/[^a-zëç0-9_]/g, '');
    const alias = ImportService.ACTIVITY_OUTCOME_ALIASES[norm];
    if (alias) return alias;
    const upper = raw.trim().toUpperCase();
    const valid = ['CONTACTED','NO_ANSWER','PROMISE_RECEIVED','REFUSED','PARTIAL_PAYMENT','FULL_PAYMENT','DISPUTE','DECEASED','OTHER'];
    return valid.includes(upper) ? upper : null;
  }

  templateActivitiesXlsx(): Buffer {
    const headers = ['case_reference', 'activity_type', 'date', 'officer_code', 'outcome', 'notes', 'promise_amount'];
    const types = ['CALL','VISIT','SMS','EMAIL','LETTER','PROMISE_TO_PAY','PAYMENT_RECEIVED','LEGAL_ACTION','NOTE','FIELD_VISIT','CALL_BORROWER','CALL_GUARANTOR','VISIT_BORROWER','VISIT_GUARANTOR','WARNING_LETTER','MEETING_BORROWER','MEETING_GUARANTOR'].join(', ');
    const outcomes = ['CONTACTED','NO_ANSWER','PROMISE_RECEIVED','REFUSED','PARTIAL_PAYMENT','FULL_PAYMENT','DISPUTE','DECEASED','OTHER'].join(', ');
    const examples = [
      ['DLR-2024-ABCDEF', 'CALL', '2024-03-15', 3, 'CONTACTED', 'Klienti u kontaktua, premtoi pagesë brenda javës', ''],
      ['DLR-2024-GHIJKL', 'PROMISE_TO_PAY', '2024-03-16', 3, 'PROMISE_RECEIVED', 'Premtim pagese', 500],
      ['DLR-2024-MNOPQR', 'VISIT', '2024-03-17', '', 'NO_ANSWER', 'Nuk u gjet në shtëpi', ''],
      ['', '', '', '', '', `Llojet e aktivitetit (activity_type): ${types}`, ''],
      ['', '', '', '', '', `Rezultatet (outcome): ${outcomes}`, ''],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 50 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Aktivitetet');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  templatePaymentsXlsx(): Buffer {
    const headers = ['case_reference', 'amount', 'date', 'reference', 'officer_code', 'channel', 'notes'];
    const examples = [
      ['DLR-2024-ABCDEF', 500.00, '2024-03-15', 'PAY-2024-001', 3, 'BANK_TRANSFER', 'Pagesa e parë e muajit mars'],
      ['DLR-2024-GHIJKL', 1200.50, '2024-03-16', '', 3, 'CASH', ''],
      ['DLR-2024-MNOPQR', 300.00, '2024-03-17', 'PAY-2024-003', '', '', 'Pagese e pjesshme'],
      ['', '', '', '', '', '', 'Kanalet (channel): BANK_TRANSFER, CASH, CHECK, ONLINE, OTHER (opsional)'],
      ['', '', '', '', '', '', 'reference: nëse lihet bosh gjenerohet automatikisht'],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Pagesat');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async importActivities(buffer: Buffer, importedById: string): Promise<{ total: number; succeeded: number; failed: number; errors: { row: number; ref: string; error: string }[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    if (raw.length === 0) throw new BadRequestException('Dokumenti nuk ka rreshta me të dhëna');
    if (raw.length > 50000) throw new BadRequestException('Maksimumi i lejuar është 50,000 rreshta');

    // Normalise column keys
    const rows = raw.map(r => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        const norm = normaliseKey(k);
        out[norm] = String(v ?? '').trim();
      }
      return out;
    });

    // Pre-load officers
    const officers = await this.prisma.user.findMany({ select: { id: true, userCode: true, fullName: true } });
    const officerByCode = new Map(officers.map(o => [o.userCode, o.id]));

    let succeeded = 0, failed = 0;
    const errors: { row: number; ref: string; error: string }[] = [];
    const CHUNK = 200;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const caseRef = (row['case_reference'] ?? row['caseref'] ?? row['ref'] ?? '').trim();
      const actTypeRaw = (row['activity_type'] ?? row['activitytype'] ?? row['tipi'] ?? row['type'] ?? '').trim();
      const dateRaw = row['date'] ?? row['data'] ?? row['occurred_at'] ?? '';
      const notesRaw = row['notes'] ?? row['shenime'] ?? row['shenimet'] ?? row['pershkrimi'] ?? '';
      const outcomeRaw = row['outcome'] ?? row['rezultati'] ?? '';
      const promiseAmtRaw = row['promise_amount'] ?? row['shuma'] ?? row['vlera'] ?? '';
      const officerCodeRaw = row['officer_code'] ?? row['officer'] ?? row['zyrtari'] ?? '';

      if (!caseRef && !actTypeRaw) { continue; } // blank row

      try {
        if (!caseRef) throw new Error('case_reference mungon');
        const actType = this.resolveActivityType(actTypeRaw);
        if (!actType) throw new Error(`activity_type "${actTypeRaw}" nuk njihet`);
        const occurredAt = parseDate(dateRaw);
        if (!occurredAt) throw new Error(`data "${dateRaw}" nuk mund të lexohet`);

        const cas = await this.prisma.case.findUnique({ where: { caseReference: caseRef }, select: { id: true } });
        if (!cas) throw new Error(`rasti "${caseRef}" nuk u gjet`);

        let officerId = importedById;
        if (officerCodeRaw) {
          const code = parseInt(officerCodeRaw);
          const found = !isNaN(code) ? officerByCode.get(code) : undefined;
          if (found) officerId = found;
        }

        const outcome = this.resolveActivityOutcome(outcomeRaw) ?? undefined;
        const promiseAmount = promiseAmtRaw ? parseDecimal(promiseAmtRaw) || undefined : undefined;

        await this.prisma.activity.create({
          data: {
            caseId: cas.id,
            officerId,
            activityType: actType as any,
            occurredAt,
            notes: notesRaw || undefined,
            outcome: outcome as any,
            promiseAmount: promiseAmount ?? undefined,
          },
        });
        succeeded++;
      } catch (e: any) {
        failed++;
        errors.push({ row: rowNum, ref: caseRef || `rreshti ${rowNum}`, error: e.message });
      }

      if (i > 0 && i % CHUNK === 0) await new Promise<void>(r => setImmediate(r));
    }

    return { total: rows.length, succeeded, failed, errors };
  }

  async importPayments(buffer: Buffer, importedById: string): Promise<{ total: number; succeeded: number; failed: number; errors: { row: number; ref: string; error: string }[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    if (raw.length === 0) throw new BadRequestException('Dokumenti nuk ka rreshta me të dhëna');
    if (raw.length > 50000) throw new BadRequestException('Maksimumi i lejuar është 50,000 rreshta');

    const rows = raw.map(r => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        const norm = normaliseKey(k);
        out[norm] = String(v ?? '').trim();
      }
      return out;
    });

    const officers = await this.prisma.user.findMany({ select: { id: true, userCode: true } });
    const officerByCode = new Map(officers.map(o => [o.userCode, o.id]));

    // Pre-load existing references to avoid duplicates
    const existingRefs = new Set(
      (await this.prisma.payment.findMany({ select: { paymentReference: true } })).map(p => p.paymentReference),
    );

    let succeeded = 0, failed = 0;
    const errors: { row: number; ref: string; error: string }[] = [];
    const CHUNK = 200;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const caseRef = (row['case_reference'] ?? row['caseref'] ?? row['ref'] ?? '').trim();
      const amountRaw = row['amount'] ?? row['shuma'] ?? row['vlera'] ?? '';
      const dateRaw = row['date'] ?? row['data'] ?? row['payment_date'] ?? '';
      const refRaw = (row['reference'] ?? row['payment_reference'] ?? row['referenca'] ?? '').trim();
      const officerCodeRaw = row['officer_code'] ?? row['officer'] ?? row['zyrtari'] ?? '';
      const channelRaw = (row['channel'] ?? row['kanali'] ?? '').trim().toUpperCase();
      const notesRaw = row['notes'] ?? row['shenime'] ?? row['shenimet'] ?? '';

      if (!caseRef && !amountRaw) { continue; }

      try {
        if (!caseRef) throw new Error('case_reference mungon');
        const amount = parseDecimal(amountRaw);
        if (!amount || amount <= 0) throw new Error(`shuma "${amountRaw}" nuk është e vlefshme`);
        const paymentDate = parseDate(dateRaw);
        if (!paymentDate) throw new Error(`data "${dateRaw}" nuk mund të lexohet`);

        const cas = await this.prisma.case.findUnique({ where: { caseReference: caseRef }, select: { id: true } });
        if (!cas) throw new Error(`rasti "${caseRef}" nuk u gjet`);

        let officerId = importedById;
        if (officerCodeRaw) {
          const code = parseInt(officerCodeRaw);
          const found = !isNaN(code) ? officerByCode.get(code) : undefined;
          if (found) officerId = found;
        }

        // Build unique paymentReference
        let payRef = refRaw.slice(0, 50);
        if (!payRef) {
          payRef = `IMP-${caseRef.slice(-6)}-${i + 1}-${Date.now().toString(36)}`.slice(0, 50);
        }
        if (existingRefs.has(payRef)) {
          payRef = `${payRef.slice(0, 40)}-${Date.now().toString(36)}`.slice(0, 50);
        }

        await this.prisma.payment.create({
          data: {
            caseId: cas.id,
            officerId,
            paymentReference: payRef,
            amount,
            paymentDate,
            paymentChannel: channelRaw || undefined,
            notes: notesRaw || undefined,
          },
        });
        existingRefs.add(payRef);
        succeeded++;
      } catch (e: any) {
        failed++;
        errors.push({ row: rowNum, ref: caseRef || `rreshti ${rowNum}`, error: e.message });
      }

      if (i > 0 && i % CHUNK === 0) await new Promise<void>(r => setImmediate(r));
    }

    return { total: rows.length, succeeded, failed, errors };
  }

  private validateRow(row: ImportRow, rowNum: number) {
    const req = (field: string, label: string) => {
      if (!cleanId(row[field])?.trim()) throw new Error(`${label} mungon (rreshti ${rowNum})`);
    };
    if (!row.full_name?.trim())
      throw new Error(`Emri i plotë mungon (rreshti ${rowNum})`);
    req('loan_number', 'Numri i kredisë');
    req('institution_name', 'Institucioni');
    if (parseDecimal(row.current_outstanding_balance) < 0)
      throw new Error(`Borxhi aktual nuk mund të jetë negativ (rreshti ${rowNum})`);
  }
}
