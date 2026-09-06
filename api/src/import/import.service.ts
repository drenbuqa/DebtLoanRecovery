import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as XLSX from 'xlsx';

const REQUIRED_COLS = [
  'personal_id', 'first_name', 'last_name',
  'loan_number', 'institution_name',
  'original_loan_amount', 'disbursed_amount', 'current_outstanding_balance',
  'disbursement_date',
];

// Optional guarantor columns — all must be present to import a guarantor
const GUARANTOR_COLS = ['guarantor_personal_id', 'guarantor_first_name', 'guarantor_last_name'];

interface ImportRow {
  personal_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  loan_number: string;
  institution_name: string;
  original_loan_amount: string;
  disbursed_amount: string;
  current_outstanding_balance: string;
  currency?: string;
  interest_rate?: string;
  product_type?: string;
  disbursement_date: string;
  maturity_date?: string;
  last_payment_date?: string;
  days_past_due?: string;
  npl_classification?: string;
  office_code?: string;
  // Guarantor (optional)
  guarantor_personal_id?: string;
  guarantor_first_name?: string;
  guarantor_last_name?: string;
  guarantor_phone?: string;
  // Co-borrower (optional)
  co_borrower_personal_id?: string;
  co_borrower_first_name?: string;
  co_borrower_last_name?: string;
  co_borrower_phone?: string;
  [key: string]: string | undefined;
}

function normaliseKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseDecimal(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[,\s]/g, '')) || 0;
}

function parseDate(v: string | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

export interface ImportResult {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: { row: number; loan_number: string; error: string }[];
}

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  templateCsv(): string {
    const headers = [
      // Borrower
      'personal_id', 'first_name', 'last_name', 'date_of_birth',
      'phone1', 'phone2', 'email', 'address', 'city',
      // Loan
      'loan_number', 'institution_name',
      'original_loan_amount', 'disbursed_amount', 'current_outstanding_balance',
      'currency', 'interest_rate', 'product_type',
      'disbursement_date', 'maturity_date', 'last_payment_date',
      'days_past_due', 'npl_classification', 'office_code',
      // Guarantor (optional)
      'guarantor_personal_id', 'guarantor_first_name', 'guarantor_last_name', 'guarantor_phone',
      // Co-borrower (optional)
      'co_borrower_personal_id', 'co_borrower_first_name', 'co_borrower_last_name', 'co_borrower_phone',
    ];
    const example = [
      '1234567890', 'Arben', 'Gashi', '1985-03-15',
      '+38344123456', '', 'a.gashi@email.com', 'Rruga Nene Tereza 12', 'Pristina',
      'LOAN-2024-001', 'ProCredit Bank',
      '15000.00', '15000.00', '12500.00',
      'EUR', '0.1200', 'Consumer',
      '2024-01-15', '2027-01-15', '2024-11-01',
      '45', 'WATCH', 'PRK',
      // Guarantor example
      '9876543210', 'Vjosa', 'Berisha', '+38344654321',
      // Co-borrower — leave blank
      '', '', '', '',
    ];
    return [headers.join(','), example.join(',')].join('\n');
  }

  async importFile(
    buffer: Buffer,
    mimeType: string,
    importedById: string,
    importedByUsername: string,
  ): Promise<ImportResult> {
    let rows: ImportRow[];
    try {
      rows = this.parseFile(buffer);
    } catch (e: any) {
      throw new BadRequestException(`Cannot parse file: ${e.message}`);
    }

    if (rows.length === 0) throw new BadRequestException('File contains no data rows');
    if (rows.length > 5000) throw new BadRequestException('Maximum 5,000 rows per import');

    const cols = Object.keys(rows[0]).map(normaliseKey);
    const missing = REQUIRED_COLS.filter(r => !cols.includes(r));
    if (missing.length) throw new BadRequestException(`Missing required columns: ${missing.join(', ')}`);

    const results: ImportResult = { total: rows.length, succeeded: 0, failed: 0, skipped: 0, errors: [] };

    const institutions = await this.prisma.institution.findMany({ select: { id: true, name: true, shortName: true } });
    const instMap = new Map(institutions.map(i => [i.name.toLowerCase(), i]));
    const offices = await this.prisma.office.findMany({ select: { id: true, code: true } });
    const officeMap = new Map(offices.map(o => [o.code.toLowerCase(), o]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const loanNum = row.loan_number?.trim() ?? `row-${rowNum}`;

      try {
        this.validateRow(row);

        const existing = await this.prisma.loan.findUnique({ where: { loanNumber: loanNum } });
        if (existing) { results.skipped++; continue; }

        let institution = instMap.get(row.institution_name.trim().toLowerCase());
        if (!institution) {
          const name = row.institution_name.trim();
          const created = await this.prisma.institution.create({
            data: { name, shortName: name.slice(0, 20) },
            select: { id: true, name: true, shortName: true },
          });
          institution = created;
          instMap.set(name.toLowerCase(), created);
        }

        const officeCode = row.office_code?.trim().toLowerCase();
        const office = officeCode ? officeMap.get(officeCode) : undefined;

        await this.prisma.$transaction(async (tx) => {
          // Upsert primary borrower
          const borrower = await tx.person.upsert({
            where: { personalId: row.personal_id.trim() },
            create: {
              personalId: row.personal_id.trim(),
              firstName: row.first_name.trim(),
              lastName: row.last_name.trim(),
              dateOfBirth: parseDate(row.date_of_birth),
              email: row.email?.trim() || undefined,
              address: row.address?.trim() || undefined,
              city: row.city?.trim() || undefined,
            },
            update: {
              firstName: row.first_name.trim(),
              lastName: row.last_name.trim(),
              email: row.email?.trim() || undefined,
            },
          });
          // Upsert phones for borrower
          for (const [phone, isPrimary] of [[row.phone1?.trim(), true], [row.phone2?.trim(), false]] as [string | undefined, boolean][]) {
            if (phone) {
              const exists = await tx.personPhone.findFirst({ where: { personId: borrower.id, phoneNumber: phone } });
              if (!exists) await tx.personPhone.create({ data: { personId: borrower.id, phoneNumber: phone, phoneType: 'MOBILE', isPrimary } });
            }
          }

          const loan = await tx.loan.create({
            data: {
              loanNumber: loanNum,
              institutionId: institution!.id,
              borrowerId: borrower.id,
              originalLoanAmount: parseDecimal(row.original_loan_amount),
              disbursedAmount: parseDecimal(row.disbursed_amount),
              currentOutstandingBalance: parseDecimal(row.current_outstanding_balance),
              currency: row.currency?.trim() || 'EUR',
              interestRate: row.interest_rate ? parseDecimal(row.interest_rate) : undefined,
              productType: row.product_type?.trim() || undefined,
              disbursementDate: parseDate(row.disbursement_date)!,
              maturityDate: parseDate(row.maturity_date),
              lastPaymentDate: parseDate(row.last_payment_date),
              daysPastDue: parseInt(row.days_past_due ?? '0') || 0,
              nplClassification: this.parseNplClass(row.npl_classification),
              dpdLastCalculatedAt: new Date(),
            },
          });

          // Add borrower as BORROWER party
          await tx.loanParty.create({
            data: { loanId: loan.id, personId: borrower.id, role: 'BORROWER' },
          });

          // Upsert and link guarantor if provided
          if (row.guarantor_personal_id?.trim() && row.guarantor_first_name?.trim() && row.guarantor_last_name?.trim()) {
            const guarantor = await tx.person.upsert({
              where: { personalId: row.guarantor_personal_id.trim() },
              create: {
                personalId: row.guarantor_personal_id.trim(),
                firstName: row.guarantor_first_name.trim(),
                lastName: row.guarantor_last_name.trim(),
              },
              update: {
                firstName: row.guarantor_first_name.trim(),
                lastName: row.guarantor_last_name.trim(),
              },
            });
            if (row.guarantor_phone?.trim()) {
              const exists = await tx.personPhone.findFirst({ where: { personId: guarantor.id, phoneNumber: row.guarantor_phone.trim() } });
              if (!exists) await tx.personPhone.create({ data: { personId: guarantor.id, phoneNumber: row.guarantor_phone.trim(), phoneType: 'MOBILE', isPrimary: true } });
            }
            await tx.loanParty.createMany({
              data: [{ loanId: loan.id, personId: guarantor.id, role: 'GUARANTOR' }],
              skipDuplicates: true,
            });
          }

          // Upsert and link co-borrower if provided
          if (row.co_borrower_personal_id?.trim() && row.co_borrower_first_name?.trim() && row.co_borrower_last_name?.trim()) {
            const coBorrower = await tx.person.upsert({
              where: { personalId: row.co_borrower_personal_id.trim() },
              create: {
                personalId: row.co_borrower_personal_id.trim(),
                firstName: row.co_borrower_first_name.trim(),
                lastName: row.co_borrower_last_name.trim(),
              },
              update: {
                firstName: row.co_borrower_first_name.trim(),
                lastName: row.co_borrower_last_name.trim(),
              },
            });
            if (row.co_borrower_phone?.trim()) {
              const exists = await tx.personPhone.findFirst({ where: { personId: coBorrower.id, phoneNumber: row.co_borrower_phone.trim() } });
              if (!exists) await tx.personPhone.create({ data: { personId: coBorrower.id, phoneNumber: row.co_borrower_phone.trim(), phoneType: 'MOBILE', isPrimary: true } });
            }
            await tx.loanParty.createMany({
              data: [{ loanId: loan.id, personId: coBorrower.id, role: 'CO_BORROWER' }],
              skipDuplicates: true,
            });
          }

          const caseRef = `DLR-${new Date().getFullYear()}-${String(loan.id).slice(0, 6).toUpperCase()}`;
          await tx.case.create({
            data: { caseReference: caseRef, loanId: loan.id, officeId: office?.id, status: 'ACTIVE', collectionStage: 'D1' },
          });
        });

        results.succeeded++;
      } catch (e: any) {
        results.failed++;
        results.errors.push({ row: rowNum, loan_number: loanNum, error: e.message ?? String(e) });
      }
    }

    // Audit log — one entry for the entire import batch
    await this.audit.log({
      userId: importedById,
      username: importedByUsername,
      action: 'LOAN_IMPORT',
      entity: 'Loan',
      details: `Imported ${results.total} rows: ${results.succeeded} succeeded, ${results.failed} failed, ${results.skipped} skipped`,
    });

    return results;
  }

  private parseFile(buffer: Buffer): ImportRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return raw.map(r => {
      const out: any = {};
      for (const [k, v] of Object.entries(r)) out[normaliseKey(k)] = String(v).trim();
      return out;
    });
  }

  private validateRow(row: ImportRow) {
    if (!row.personal_id?.trim())      throw new Error('personal_id is required');
    if (!row.first_name?.trim())       throw new Error('first_name is required');
    if (!row.last_name?.trim())        throw new Error('last_name is required');
    if (!row.loan_number?.trim())      throw new Error('loan_number is required');
    if (!row.institution_name?.trim()) throw new Error('institution_name is required');
    if (!row.disbursement_date?.trim()) throw new Error('disbursement_date is required');
    if (parseDecimal(row.original_loan_amount) <= 0) throw new Error('original_loan_amount must be > 0');
    if (parseDecimal(row.disbursed_amount) < 0)      throw new Error('disbursed_amount must be >= 0');
    if (parseDecimal(row.current_outstanding_balance) < 0) throw new Error('current_outstanding_balance must be >= 0');
  }

  private parseNplClass(v: string | undefined): any {
    if (!v) return undefined;
    const map: Record<string, string> = {
      performing: 'PERFORMING', watch: 'WATCH',
      substandard: 'SUBSTANDARD', doubtful: 'DOUBTFUL', loss: 'LOSS',
    };
    return map[v.trim().toLowerCase()] ?? undefined;
  }
}
