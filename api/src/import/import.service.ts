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
  // DOB
  'date_of_birth': 'date_of_birth', 'dob': 'date_of_birth', 'birth_date': 'date_of_birth',
  'birthdate': 'date_of_birth', 'data_lindjes': 'date_of_birth',
  // Phones
  'phone1': 'phone1', 'phone_1': 'phone1', 'phone': 'phone1', 'mobile': 'phone1',
  'tel': 'phone1', 'telefon': 'phone1', 'tel1': 'phone1', 'celular': 'phone1',
  'phone_nr': 'phone1', 'phone_number': 'phone1',
  'phone2': 'phone2', 'phone_2': 'phone2', 'tel2': 'phone2', 'alternative_phone': 'phone2',
  // Contact
  'email': 'email', 'email_address': 'email', 'e_mail': 'email',
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
  'maturity_date': 'maturity_date', 'due_date': 'maturity_date', 'end_date': 'maturity_date',
  'data_maturimit': 'maturity_date', 'expiry_date': 'maturity_date',
  'last_payment_date': 'last_payment_date', 'last_payment': 'last_payment_date',
  'data_pageses_se_fundit': 'last_payment_date',
  // DPD / NPL
  'days_past_due': 'days_past_due', 'dpd': 'days_past_due', 'overdue_days': 'days_past_due',
  'dite_vonese': 'days_past_due', 'days_overdue': 'days_past_due',
  'npl_classification': 'npl_classification', 'npl_class': 'npl_classification',
  'npl': 'npl_classification', 'classification': 'npl_classification', 'category': 'npl_classification',
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
  // Guarantor 1
  'guarantor_personal_id': 'guarantor_personal_id',
  '1_guarantor_personal_id': 'guarantor_personal_id',
  'guarantor_id': 'guarantor_personal_id',
  'guarantor_first_name': 'guarantor_first_name', 'guarantor_firstname': 'guarantor_first_name',
  'guarantor_last_name': 'guarantor_last_name', 'guarantor_lastname': 'guarantor_last_name',
  'guarantor_first_last_name': 'guarantor_full_name',
  '1_guarantor_first_last_name': 'guarantor_full_name',
  'guarantor_phone': 'guarantor_phone', 'guarantor_tel': 'guarantor_phone',
  '1_guarantor_phone': 'guarantor_phone',
  // Guarantor 2
  '2_guarantor_personal_id': 'guarantor2_personal_id',
  'guarantor2_personal_id': 'guarantor2_personal_id',
  '2_guarantor_first_last_name': 'guarantor2_full_name',
  'guarantor2_first_last_name': 'guarantor2_full_name',
  '2_guarantor_phone': 'guarantor2_phone',
  'guarantor2_phone': 'guarantor2_phone',
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
  date_of_birth?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
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
  maturity_date?: string;
  last_payment_date?: string;
  days_past_due?: string;
  npl_classification?: string;
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

const NPL_MAP: Record<string, string> = {
  performing: 'PERFORMING', watch: 'WATCH', watchlist: 'WATCH',
  substandard: 'SUBSTANDARD', sub_standard: 'SUBSTANDARD',
  doubtful: 'DOUBTFUL', loss: 'LOSS', write_off: 'LOSS', written_off: 'LOSS',
  i_dyshimte: 'DOUBTFUL', humbje: 'LOSS', nënstandarde: 'SUBSTANDARD',
};

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

function parseNplClass(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const key = v.trim().toLowerCase().replace(/[\s\-]+/g, '_');
  return NPL_MAP[key] ?? undefined;
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
  { key: 'date_of_birth',               label: 'Data e Lindjes',                    required: false },
  { key: 'phone1',                      label: 'Telefoni 1',                        required: false },
  { key: 'phone2',                      label: 'Telefoni 2',                        required: false },
  { key: 'email',                       label: 'Email',                             required: false },
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
  { key: 'maturity_date',               label: 'Data e Maturimit',                  required: false },
  { key: 'last_payment_date',           label: 'Data e Pagesës së Fundit',          required: false },
  // NPL / DPD
  { key: 'days_past_due',               label: 'Ditë Vonesë',                       required: false },
  { key: 'npl_classification',          label: 'Klasifikimi NPL',                   required: false },
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
      'personal_id', 'full_name', 'date_of_birth',
      'phone1', 'phone2', 'email', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer_id', 'secondary_officer_id',
      'original_loan_amount', 'principal_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'maturity_date', 'last_payment_date',
      'days_past_due', 'npl_classification', 'office_code',
      '1 guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2 guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_Last_name', 'co_borrower_phone',
    ];
    const example = [
      '1234567890', 'Arben Gashi', '1985-03-15',
      '+38344123456', '', 'a.gashi@email.com', 'Rruga Nene Tereza 12', 'Prishtinë',
      'PCB-2024-001', 'ProCredit Bank Kosovë',
      'paste-officer-uuid-here', '',
      15000, 15000, 12500,
      'Consumer', '2024-01-15', '2027-01-15', '2024-11-01',
      45, 'WATCH', 'PRK',
      '9876543210', 'Vjosa Berisha', '+38344654321',
      '9876543211', 'Agron Berisha', '+38344654322',
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

  async importFile(
    buffer: Buffer,
    fileName: string,
    importedById: string,
    importedByUsername: string,
    columnOverrides?: Record<string, string>,  // original col → canonical key
    institutionOverride?: string,              // fixed institution name when not in file
  ): Promise<ImportResult> {
    let rows: ImportRow[];
    try {
      rows = this.parseFile(buffer, columnOverrides);
    } catch (e: any) {
      throw new BadRequestException(`Dokumenti nuk mund të lexohet: ${e.message}`);
    }

    if (rows.length === 0) throw new BadRequestException('Dokumenti nuk ka rreshta me të dhëna');
    if (rows.length > 50000) throw new BadRequestException('Maksimumi i lejuar është 50,000 rreshta për import');

    // Apply institution override to rows that lack it
    if (institutionOverride?.trim()) {
      for (const row of rows) {
        if (!row.institution_name?.trim()) row.institution_name = institutionOverride.trim();
      }
    }

    // Combine first_name + last_name → full_name for banks that send them separately
    for (const row of rows) {
      if (!row.full_name?.trim() && ((row as any).first_name || (row as any).last_name)) {
        const fn = ((row as any).first_name ?? '').trim();
        const ln = ((row as any).last_name ?? '').trim();
        row.full_name = (fn + (ln ? ' ' + ln : '')).trim();
      }
    }

    // Validate required columns are present
    const firstRowKeys = Object.keys(rows[0]);
    const missing = REQUIRED_COLS.filter(k => !firstRowKeys.includes(k));
    if (missing.length) {
      const labels = missing.map(k => ALL_FIELDS.find(f => f.key === k)?.label ?? k);
      throw new BadRequestException(
        `Kolona të detyrueshme mungojnë: ${labels.join(', ')}.`
      );
    }

    // Create import job record
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

    const errors: { row: number; loan_number: string; error: string }[] = [];
    let succeeded = 0, failed = 0, skipped = 0;

    const institutions = await this.prisma.institution.findMany({ select: { id: true, name: true, shortName: true } });
    const instMap = new Map(institutions.map(i => [i.name.toLowerCase().trim(), i]));
    const offices = await this.prisma.office.findMany({ select: { id: true, code: true } });
    const officeMap = new Map(offices.map(o => [o.code.toLowerCase(), o]));
    const officers = await this.prisma.user.findMany({ select: { id: true, fullName: true } });
    const officerMap = new Map(officers.map(o => [o.fullName.toLowerCase().trim(), o.id]));
    const officerFirstNameMap = new Map(officers.map(o => [o.fullName.toLowerCase().trim().split(/\s+/)[0], o.id]));
    const officerIdSet = new Set(officers.map(o => o.id));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const loanNum = cleanId(row.loan_number) || `row-${rowNum}`;

      try {
        this.validateRow(row, rowNum);

        const existing = await this.prisma.loan.findUnique({ where: { loanNumber: loanNum } });
        if (existing) { skipped++; continue; }

        // Resolve institution — create if not found
        const instKey = row.institution_name.trim().toLowerCase();
        let institution = instMap.get(instKey);
        if (!institution) {
          const name = row.institution_name.trim();
          const created = await this.prisma.institution.create({
            data: { name, shortName: name.slice(0, 20) },
            select: { id: true, name: true, shortName: true },
          });
          institution = created;
          instMap.set(instKey, created);
        }

        const officeCode = row.office_code?.trim().toLowerCase();
        const office = officeCode ? officeMap.get(officeCode) : undefined;

        // Resolve officers — prefer UUID column, fall back to name match
        const resolveOfficer = (id: string | undefined, name: string | undefined) => {
          if (id?.trim()) return officerIdSet.has(id.trim()) ? id.trim() : undefined;
          if (!name?.trim()) return undefined;
          const key = name.trim().toLowerCase();
          return officerMap.get(key) ?? officerFirstNameMap.get(key.split(/\s+/)[0]) ?? undefined;
        };
        const assignedOfficerId  = resolveOfficer(row.assigned_officer_id,   row.assigned_officer_name);
        const secondaryOfficerId = resolveOfficer(row.secondary_officer_id,  row.secondary_officer_name);

        await this.prisma.$transaction(async (tx) => {
          const personalId = (cleanId(row.personal_id) || `NOID-${loanNum}`).slice(0, 30);
          const fullName = (row.full_name?.trim() || '').slice(0, 200);

          const borrower = await tx.person.upsert({
            where: { personalId },
            create: {
              personalId,
              fullName,
              dateOfBirth: parseDate(row.date_of_birth),
              email: row.email?.trim() || undefined,
              address: row.address?.trim() || undefined,
              city: row.city?.trim() || undefined,
            },
            update: {
              fullName,
              ...(row.email?.trim() && { email: row.email.trim() }),
              ...(row.address?.trim() && { address: row.address.trim() }),
              ...(row.city?.trim() && { city: row.city.trim() }),
            },
          });

          for (const [phone, isPrimary] of [
            [row.phone1?.trim(), true],
            [row.phone2?.trim(), false],
          ] as [string | undefined, boolean][]) {
            if (phone) {
              const phoneNum = phone.slice(0, 30);
              const exists = await tx.personPhone.findFirst({ where: { personId: borrower.id, phoneNumber: phoneNum } });
              if (!exists) await tx.personPhone.create({ data: { personId: borrower.id, phoneNumber: phoneNum, phoneType: 'MOBILE', isPrimary } });
            }
          }

          const principalAmt = parseDecimal(row.principal_amount || row.original_loan_amount);
          const originalAmt = parseDecimal(row.original_loan_amount || row.principal_amount);

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
              disbursementDate: parseDate(row.disbursement_date) ?? new Date(0),
              maturityDate: parseDate(row.maturity_date),
              lastPaymentDate: parseDate(row.last_payment_date),
              daysPastDue: parseInt(row.days_past_due ?? '0') || 0,
              nplClassification: parseNplClass(row.npl_classification) as any,
              dpdLastCalculatedAt: new Date(),
            },
          });

          await tx.loanParty.create({ data: { loanId: loan.id, personId: borrower.id, role: 'BORROWER' } });

          // Helper: upsert a party (guarantor / co-borrower) from id + name + phone
          const upsertParty = async (
            rawId: string | undefined,
            rawFullName: string | undefined,
            rawFirstName: string | undefined,
            rawLastName: string | undefined,
            rawPhone: string | undefined,
            role: LoanPartyRole,
          ) => {
            const pid = cleanId(rawId);
            if (!pid) return;
            // Resolve name — prefer individual fields, fall back to splitting full name
            let fName = rawFirstName?.trim() || '';
            let lName = rawLastName?.trim() || '';
            if (!fName && rawFullName) {
              const split = splitName(rawFullName);
              fName = split?.firstName ?? '';
              lName = split?.lastName ?? '';
            }
            if (!fName) return; // no usable name
            const safePid = pid.slice(0, 30);
            const safeFullName = (fName + (lName ? " " + lName : "")).trim().slice(0, 200);
            const person = await tx.person.upsert({
              where: { personalId: safePid },
              create: { personalId: safePid, fullName: safeFullName },
              update: { fullName: safeFullName },
            });
            if (rawPhone?.trim()) {
              const ph = rawPhone.trim().slice(0, 30);
              const exists = await tx.personPhone.findFirst({ where: { personId: person.id, phoneNumber: ph } });
              if (!exists) await tx.personPhone.create({ data: { personId: person.id, phoneNumber: ph, phoneType: 'MOBILE', isPrimary: true } });
            }
            await tx.loanParty.createMany({ data: [{ loanId: loan.id, personId: person.id, role }], skipDuplicates: true });
          };

          await upsertParty(
            row.guarantor_personal_id, row.guarantor_full_name,
            row.guarantor_first_name, row.guarantor_last_name,
            row.guarantor_phone, 'GUARANTOR',
          );
          await upsertParty(
            row.guarantor2_personal_id, row.guarantor2_full_name,
            undefined, undefined,
            row.guarantor2_phone, 'GUARANTOR',
          );
          await upsertParty(
            row.co_borrower_personal_id, row.co_borrower_full_name,
            row.co_borrower_first_name, row.co_borrower_last_name,
            row.co_borrower_phone, 'CO_BORROWER',
          );

          const year = new Date().getFullYear();
          const caseRef = `DLR-${year}-${loan.id.slice(0, 6).toUpperCase()}`;
          await tx.case.create({
            data: {
              caseReference: caseRef,
              loanId: loan.id,
              officeId: office?.id,
              assignedOfficerId: assignedOfficerId ?? undefined,
              secondaryOfficerId: secondaryOfficerId ?? undefined,
              importJobId: job.id,
              status: 'ACTIVE',
              collectionStage: 'D1',
            },
          });
        });

        succeeded++;
      } catch (e: any) {
        failed++;
        const raw = e.message ?? String(e);
        const msg = this.friendlyImportError(raw);
        errors.push({ row: rowNum, loan_number: loanNum, error: msg });
        // Persist error to DB
        await this.prisma.importError.create({
          data: { importJobId: job.id, rowNumber: rowNum, errorMessage: msg, rawData: JSON.stringify(rows[i]) },
        }).catch(() => {});
      }
    }

    // Finalise the job record
    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: failed === rows.length ? 'FAILED' : 'COMPLETED',
        successfulRows: succeeded,
        failedRows: failed,
        totalRows: rows.length,
        completedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: importedById,
      username: importedByUsername,
      action: 'LOAN_IMPORT',
      entity: 'Loan',
      details: `Import "${fileName}": ${succeeded} sukses, ${failed} gabime, ${skipped} anashkaluar nga ${rows.length} gjithsej`,
    });

    return { jobId: job.id, fileName, total: rows.length, succeeded, failed, skipped, errors };
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
        const isNumericField = ['current_outstanding_balance','original_loan_amount','principal_amount','days_past_due','interest_rate'].includes(resolved);
        out[resolved] = (!isNumericField && str === '0') ? '' : str;
      }
      return out;
    });
  }

  // ── Bulk partial update ────────────────────────────────────────────────────────

  // Static reference code maps (shared with front-end reference panel)
  static readonly CITY_CODES: Record<number, string> = {
    1:'Decan',2:'Drenas',3:'Ferizaj',4:'Fushë Kosovë',5:'Gjilan',6:'Gllogovc/Drenas',
    7:'Gracanica',8:'Istog',9:'Kamenicë',10:'Klina',11:'Klinë',12:'Leposavic',
    13:'Lipjan',14:'Malishevë',15:'Mitrovicë',16:'Obilic',17:'Pejë',18:'Podujevë',
    19:'Prishtinë',20:'Prizren',21:'Shtime',22:'Skënderaj',23:'Suharekë',24:'Unknown',
    25:'Viti',26:'Vushtrri',27:'Zubin Potok',28:'Zvecan',29:'Novo Berdo',30:'Kacanik',
    31:'Gjakovë',32:'Dragash',33:'Rahovec',
  };

  static readonly INSTITUTION_CODES: Record<number, string> = {
    1:'BZMF',2:'Banka Ekonomike',3:'TEB',4:'KosInvest',5:'Atlantic Capital Partners',
    6:'Banka Kombëtare Tregtare',7:'Banka Private e Biznesit',8:'NLB',9:'ProCredit Bank',
    10:'Crimson Finance Found',11:'KGMAMF',12:'Klientet migruar gabim',13:'IuteCredit',
    14:'Kujtesa',15:'PADEFIUNUAR',16:'TIMI INVEST',17:'MCA',18:'BKS',19:'IPKO',
    20:'RBKO',21:'Finca',22:'Cia Berto',23:'Biznese private',24:'NOA',
    25:'Ziraat Bankasi',26:'TIMI INVEST',
  };

  static readonly NPL_CODES: Record<number, string> = {
    1:'PERFORMING',2:'WATCH',3:'SUBSTANDARD',4:'DOUBTFUL',5:'LOSS',
  };

  // ── Import rollback ────────────────────────────────────────────────────────────

  async rollbackCheck(jobId: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      select: { id: true, fileName: true, successfulRows: true, completedAt: true, cases: { select: { id: true, caseReference: true } } },
    });
    if (!job) throw new Error('Importi nuk u gjet');

    const caseIds = job.cases.map((c) => c.id);
    if (caseIds.length === 0) {
      return { canRollback: false, reason: 'Ky import nuk ka krijuar asnjë rast', blockers: [] };
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

  async bulkUpdate(buffer: Buffer, type: 'officer'|'npl'|'institution'|'city', performedById: string) {
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

    // Pre-load institution lookup for 'institution' type
    let institutionByName: Map<string, string> | null = null;
    if (type === 'institution') {
      const insts = await this.prisma.institution.findMany({ select: { id: true, name: true } });
      institutionByName = new Map(insts.map((i) => [i.name.toLowerCase().trim(), i.id]));
    }

    // Pre-load officer codes (by userCode when available, else creation order)
    let officerByCode: Map<number, string> | null = null;
    if (type === 'officer') {
      const officers = await this.prisma.user.findMany({
        where: { isActive: true, role: { in: ['OFFICER', 'MANAGER', 'ADMIN'] as any[] } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      officerByCode = new Map(officers.map((o, idx) => [idx + 1, o.id]));
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
        } else if (type === 'npl') {
          const npl = codeRaw.toUpperCase();
          const valid = ['PERFORMING','WATCH','SUBSTANDARD','DOUBTFUL','LOSS'];
          if (!valid.includes(npl)) { errors.push(`${rowLabel}: vlera NPL "${codeRaw}" nuk është e vlefshme (${valid.join(', ')})`); skipped++; continue; }
          await this.prisma.loan.update({ where: { id: cas.loanId }, data: { nplClassification: npl as any } });
          updated++;
        } else if (type === 'institution') {
          const code = parseInt(codeRaw);
          const instName = ImportService.INSTITUTION_CODES[code];
          if (!instName) { errors.push(`${rowLabel}: kodi i institucionit ${code} nuk ekziston (1-26)`); skipped++; continue; }
          const instId = institutionByName!.get(instName.toLowerCase().trim());
          if (!instId) { errors.push(`${rowLabel}: institucioni "${instName}" nuk u gjet në bazë të të dhënave`); skipped++; continue; }
          await this.prisma.loan.update({ where: { id: cas.loanId }, data: { institutionId: instId } });
          updated++;
        } else if (type === 'city') {
          const code = parseInt(codeRaw);
          const city = ImportService.CITY_CODES[code];
          if (!city) { errors.push(`${rowLabel}: kodi i qytetit ${code} nuk ekziston (1-33)`); skipped++; continue; }
          await this.prisma.person.update({ where: { id: cas.loan.borrowerId }, data: { city } });
          updated++;
        }
      } catch (e: any) {
        errors.push(`${rowLabel}: ${e.message}`);
        skipped++;
      }
    }

    return { updated, skipped, errors, total: dataRows.length };
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
