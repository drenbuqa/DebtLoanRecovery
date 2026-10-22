import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx');
import { Response } from 'express';

const BRAND = {
  primary: '#7c3aed',   // purple-600
  dark:    '#1e1b4b',   // indigo-950
  mid:     '#4c1d95',   // purple-900
  light:   '#ede9fe',   // violet-100
  text:    '#1f2937',
  muted:   '#6b7280',
  white:   '#ffffff',
};

function euro(n: unknown): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n));
}

function date(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── Office scope helper ─────────────────────────────────────────────────────

  private async officeCaseWhere(officeId: string) {
    const officeOfficers = await this.prisma.user.findMany({
      where: { officeId },
      select: { id: true },
    });
    const officerIds = officeOfficers.map((u) => u.id);
    return officerIds.length > 0
      ? { OR: [{ officeId }, { assignedOfficerId: { in: officerIds } }, { secondaryOfficerId: { in: officerIds } }] }
      : { officeId };
  }

  // ─── Case Detail PDF ─────────────────────────────────────────────────────────

  async caseDetailPdf(caseId: string, res: Response) {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        loan: {
          include: {
            borrower: true,
            institution: true,
            relatedParties: { include: { person: true } },
          },
        },
        assignedOfficer: { select: { fullName: true } },
        office: { select: { name: true } },
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 20,
          include: { officer: { select: { fullName: true } } },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 20,
          include: { officer: { select: { fullName: true } } },
        },
        agreements: { orderBy: { createdAt: 'desc' }, take: 5 },
        legalProceedings: { orderBy: { filingDate: 'desc' }, take: 5 },
      },
    });
    if (!c) throw new NotFoundException('Case not found');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${c.caseReference}.pdf"`);
    doc.pipe(res);

    this.header(doc, `Case Report — ${c.caseReference}`);

    // Borrower & Loan
    this.sectionTitle(doc, 'Borrower & Loan');
    const b = c.loan.borrower;
    this.twoCol(doc, [
      ['Borrower', `${b.fullName}`],
      ['Personal ID', b.personalId],
      ['Phone', (b as any).phones?.[0]?.phoneNumber ?? '—'],
      ['Address', b.address ?? '—'],
    ]);
    this.twoCol(doc, [
      ['Loan Number', c.loan.loanNumber],
      ['Institution', c.loan.institution.name],
      ['Original Amount', euro(c.loan.originalLoanAmount)],
      ['Outstanding Balance', euro(c.loan.currentOutstandingBalance)],
    ]);

    // Case details
    this.sectionTitle(doc, 'Case Details');
    this.twoCol(doc, [
      ['Status', c.status],
      ['Stage', c.collectionStage],
      ['Assigned Officer', c.assignedOfficer?.fullName ?? '—'],
      ['Office', c.office?.name ?? '—'],
      ['Next Action', c.nextActionDate ? `${date(c.nextActionDate)} — ${c.nextActionNote ?? ''}` : '—'],
      ['Opened', date(c.createdAt)],
    ]);

    // Payments
    if (c.payments.length) {
      this.sectionTitle(doc, 'Recent Payments');
      this.table(doc,
        ['Date', 'Amount', 'Officer'],
        c.payments.map(p => [date(p.paymentDate), euro(p.amount), p.officer.fullName]),
      );
    }

    // Activities
    if (c.activities.length) {
      this.sectionTitle(doc, 'Recent Activities');
      this.table(doc,
        ['Date', 'Type', 'Outcome', 'Officer'],
        c.activities.map(a => [date(a.occurredAt), a.activityType, a.outcome ?? '—', a.officer.fullName]),
      );
    }

    // Agreements
    if (c.agreements.length) {
      this.sectionTitle(doc, 'Agreements');
      this.table(doc,
        ['Reference', 'Status', 'Total', 'Installments', 'Start', 'End'],
        c.agreements.map(a => [a.agreementReference, a.status, euro(a.totalAmount), String(a.installmentCount), date(a.startDate), date(a.endDate)]),
      );
    }

    // Legal
    if (c.legalProceedings.length) {
      this.sectionTitle(doc, 'Legal Proceedings');
      this.table(doc,
        ['Reference', 'Status', 'Filing Date', 'Court'],
        c.legalProceedings.map(l => [l.proceedingRef, l.status, date(l.filingDate), l.court ?? '—']),
      );
    }

    this.footer(doc);
    doc.end();
  }

  // ─── Portfolio Summary PDF ───────────────────────────────────────────────────

  async portfolioPdf(query: { officeId?: string; officerId?: string; status?: string }, res: Response) {
    const where: any = { deletedAt: null };
    if (query.officerId) {
      where.assignedOfficerId = query.officerId;
    } else if (query.officeId) {
      const caseFilter = await this.officeCaseWhere(query.officeId);
      if (!where.AND) where.AND = [];
      where.AND.push(caseFilter);
    }
    if (query.status) where.status = query.status;

    const [cases, stats] = await Promise.all([
      this.prisma.case.findMany({
        where,
        include: {
          loan: { include: { borrower: true, institution: true } },
          assignedOfficer: { select: { fullName: true } },
          office: { select: { name: true } },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 500,
      }),
      this.prisma.loan.aggregate({
        where: { case: where },
        _sum: { currentOutstandingBalance: true, originalLoanAmount: true },
        _count: true,
      }),
    ]);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
    doc.pipe(res);

    const title = query.status ? `Portfolio Report — ${query.status}` : 'Portfolio Report — All Cases';
    this.header(doc, title);

    // Summary stats
    this.sectionTitle(doc, 'Portfolio Summary');
    this.twoCol(doc, [
      ['Total Cases', String(cases.length)],
      ['Total Outstanding', euro(stats._sum.currentOutstandingBalance)],
      ['Total Original', euro(stats._sum.originalLoanAmount)],
      ['Report Date', date(new Date())],
    ]);

    // Case list
    if (cases.length) {
      this.sectionTitle(doc, 'Case List');
      this.table(doc,
        ['Reference', 'Borrower', 'Outstanding', 'Stage', 'Officer'],
        cases.map(c => [
          c.caseReference,
          `${c.loan.borrower.fullName}`,
          euro(c.loan.currentOutstandingBalance),
          c.collectionStage,
          c.assignedOfficer?.fullName ?? '—',
        ]),
      );
    }

    this.footer(doc);
    doc.end();
  }

  // ─── CSV Exports ─────────────────────────────────────────────────────────────

  async paymentsCsv(query: { dateFrom?: string; dateTo?: string; officeId?: string; officerId?: string }, res: Response) {
    const where: any = {};
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo   && { lte: new Date(query.dateTo) }),
      };
    }
    if (query.officerId) {
      where.case = { assignedOfficerId: query.officerId };
    } else if (query.officeId) {
      where.case = await this.officeCaseWhere(query.officeId);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        officer: { select: { fullName: true } },
        case: {
          select: {
            caseReference: true,
            loan: { select: { loanNumber: true, borrower: { select: { fullName: true } } } },
          },
        },
      },
    });

    const rows = [
      ['payment_reference', 'date', 'amount', 'currency', 'channel', 'case_reference', 'loan_number', 'borrower', 'officer', 'notes'],
      ...payments.map(p => [
        p.paymentReference,
        new Date(p.paymentDate).toISOString().slice(0, 10),
        Number(p.amount).toFixed(2),
        p.currency,
        p.paymentChannel ?? '',
        p.case.caseReference,
        p.case.loan.loanNumber,
        `${p.case.loan.borrower.fullName}`,
        p.officer.fullName,
        (p.notes ?? '').replace(/,/g, ';'),
      ]),
    ];

    const filename = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + rows.map(r => r.join(',')).join('\n'));
  }

  async activitiesCsv(query: { dateFrom?: string; dateTo?: string; officeId?: string; officerId?: string }, res: Response) {
    const where: any = {};
    if (query.dateFrom || query.dateTo) {
      where.occurredAt = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo   && { lte: new Date(query.dateTo) }),
      };
    }
    if (query.officerId) {
      where.officerId = query.officerId;
    } else if (query.officeId) {
      where.case = await this.officeCaseWhere(query.officeId);
    }

    const activities = await this.prisma.activity.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      include: {
        officer: { select: { fullName: true } },
        case: {
          select: {
            caseReference: true,
            loan: { select: { loanNumber: true, borrower: { select: { fullName: true } } } },
          },
        },
      },
    });

    const rows = [
      ['date', 'type', 'outcome', 'channel', 'case_reference', 'loan_number', 'borrower', 'officer', 'promise_amount', 'notes'],
      ...activities.map(a => [
        new Date(a.occurredAt).toISOString().slice(0, 10),
        a.activityType,
        a.outcome ?? '',
        a.channel ?? '',
        a.case.caseReference,
        a.case.loan.loanNumber,
        `${a.case.loan.borrower.fullName}`,
        a.officer.fullName,
        a.promiseAmount ? Number(a.promiseAmount).toFixed(2) : '',
        (a.notes ?? '').replace(/,/g, ';'),
      ]),
    ];

    const filename = `activities-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + rows.map(r => r.join(',')).join('\n'));
  }

  // ─── Case Status Excel ───────────────────────────────────────────────────────

  async caseStatusXlsx(query: { officerId?: string; officeId?: string; dateFrom?: string; dateTo?: string }, res: Response) {
    const where: any = { deletedAt: null };
    if (query.officerId) {
      where.assignedOfficerId = query.officerId;
    } else if (query.officeId) {
      const caseFilter = await this.officeCaseWhere(query.officeId);
      if (!where.AND) where.AND = [];
      where.AND.push(caseFilter);
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo)   where.createdAt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }

    const cases = await this.prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        loan: {
          include: {
            borrower: {
              include: {
                phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 2 },
              },
            },
            institution: true,
            relatedParties: {
              include: {
                person: {
                  include: {
                    phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
                  },
                },
              },
            },
          },
        },
        assignedOfficer: { select: { id: true, fullName: true } },
        secondaryOfficer: { select: { id: true, fullName: true } },
        office: { select: { code: true, name: true } },
      },
    });

    const headers = [
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer', 'secondary_officer',
      'original_loan_amount', 'principal_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'last_payment_date',
      'office_code',
      '1. guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2. guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
      // DLR status columns (additional, not in import template)
      'case_reference', 'case_status', 'collection_stage', 'collection_status', 'borxhi_aktual_eur',
    ];

    const d = (v: Date | string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';

    const rows = cases.map((c) => {
      const b = c.loan.borrower;
      const phones = b.phones ?? [];
      const parties = c.loan.relatedParties ?? [];
      const guarantors = parties.filter((p) => p.role === 'GUARANTOR');
      const coBorrower = parties.find((p) => p.role === 'CO_BORROWER');
      const g1 = guarantors[0]?.person;
      const g2 = guarantors[1]?.person;
      const co = coBorrower?.person;

      return [
        b.personalId ?? '',
        b.fullName ?? '',
        phones[0]?.phoneNumber ?? '',
        phones[1]?.phoneNumber ?? '',
        b.address ?? '',
        b.city ?? '',
        c.loan.loanNumber ?? '',
        c.loan.institution?.name ?? '',
        c.assignedOfficer?.fullName ?? '',
        c.secondaryOfficer?.fullName ?? '',
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.currentOutstandingBalance ?? 0),
        (c.loan as any).productType ?? '',
        d((c.loan as any).disbursementDate),
        d(c.loan.lastPaymentDate),
        (c.office as any)?.code ?? '',
        g1?.personalId ?? '',
        g1?.fullName ?? '',
        g1?.phones?.[0]?.phoneNumber ?? '',
        g2?.personalId ?? '',
        g2?.fullName ?? '',
        g2?.phones?.[0]?.phoneNumber ?? '',
        co?.personalId ?? '',
        co?.fullName ?? '',
        co?.phones?.[0]?.phoneNumber ?? '',
        c.caseReference,
        c.status,
        c.collectionStage,
        (c as any).collectionStatus ?? '',
        Number(c.loan.currentOutstandingBalance ?? 0),
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Gjendja e Dosjeve');

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `gjendja-dosjeve-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  // ─── Collections Excel ───────────────────────────────────────────────────────

  async collectionsXlsx(query: { officerId?: string; officeId?: string; dateFrom?: string; dateTo?: string }, res: Response) {
    const where: any = { voidedAt: null };
    if (query.officerId) {
      where.officerId = query.officerId;
    } else if (query.officeId) {
      where.case = await this.officeCaseWhere(query.officeId);
    }
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo   && { lte: new Date(query.dateTo) }),
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        officer: { select: { id: true, fullName: true } },
        case: {
          include: {
            loan: {
              include: {
                borrower: {
                  include: {
                    phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 2 },
                  },
                },
                institution: true,
                relatedParties: {
                  include: {
                    person: {
                      include: {
                        phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
                      },
                    },
                  },
                },
              },
            },
            assignedOfficer: { select: { id: true, fullName: true } },
            secondaryOfficer: { select: { id: true, fullName: true } },
            office: { select: { code: true, name: true } },
          },
        },
      },
    });

    const headers = [
      // Payment-specific
      'payment_reference', 'payment_date', 'payment_amount', 'currency', 'payment_channel', 'payment_notes',
      'collecting_officer',
      // Borrower & loan (migration format)
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer', 'secondary_officer',
      'original_loan_amount', 'principal_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'last_payment_date',
      'office_code',
      '1. guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2. guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
      'case_reference', 'case_status', 'collection_stage', 'collection_status',
    ];

    const d = (v: Date | string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';

    const rows = payments.map((p) => {
      const c = p.case;
      const b = c.loan.borrower;
      const phones = b.phones ?? [];
      const parties = c.loan.relatedParties ?? [];
      const guarantors = parties.filter((rp) => rp.role === 'GUARANTOR');
      const coBorrower = parties.find((rp) => rp.role === 'CO_BORROWER');
      const g1 = guarantors[0]?.person;
      const g2 = guarantors[1]?.person;
      const co = coBorrower?.person;

      return [
        p.paymentReference,
        d(p.paymentDate),
        Number(p.amount),
        p.currency,
        p.paymentChannel ?? '',
        (p.notes ?? '').replace(/"/g, '""'),
        p.officer.fullName,
        b.personalId ?? '',
        b.fullName ?? '',
        phones[0]?.phoneNumber ?? '',
        phones[1]?.phoneNumber ?? '',
        b.address ?? '',
        b.city ?? '',
        c.loan.loanNumber ?? '',
        c.loan.institution?.name ?? '',
        c.assignedOfficer?.fullName ?? '',
        c.secondaryOfficer?.fullName ?? '',
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.currentOutstandingBalance ?? 0),
        (c.loan as any).productType ?? '',
        d((c.loan as any).disbursementDate),
        d(c.loan.lastPaymentDate),
        (c.office as any)?.code ?? '',
        g1?.personalId ?? '',
        g1?.fullName ?? '',
        g1?.phones?.[0]?.phoneNumber ?? '',
        g2?.personalId ?? '',
        g2?.fullName ?? '',
        g2?.phones?.[0]?.phoneNumber ?? '',
        co?.personalId ?? '',
        co?.fullName ?? '',
        co?.phones?.[0]?.phoneNumber ?? '',
        c.caseReference,
        c.status,
        c.collectionStage,
        (c as any).collectionStatus ?? '',
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Arkëtimet');

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `arketimet-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  // ─── Agreement Status Excel ──────────────────────────────────────────────────

  async agreementStatusXlsx(query: { officerId?: string; officeId?: string; status?: string; dateFrom?: string; dateTo?: string }, res: Response) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.officerId) {
      where.case = { assignedOfficerId: query.officerId };
    } else if (query.officeId) {
      where.case = await this.officeCaseWhere(query.officeId);
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo)   where.createdAt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }

    const agreements = await this.prisma.agreement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        installments: { orderBy: { dueDate: 'asc' } },
        case: {
          include: {
            loan: {
              include: {
                borrower: {
                  include: {
                    phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 2 },
                  },
                },
                institution: true,
                relatedParties: {
                  include: {
                    person: {
                      include: {
                        phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
                      },
                    },
                  },
                },
              },
            },
            assignedOfficer: { select: { id: true, fullName: true } },
            secondaryOfficer: { select: { id: true, fullName: true } },
            office: { select: { code: true, name: true } },
          },
        },
      },
    });

    const headers = [
      // Agreement-specific
      'agreement_reference', 'agreement_status', 'total_amount', 'currency',
      'installment_count', 'paid_installments', 'overdue_installments',
      'start_date', 'end_date', 'next_due_date', 'next_due_amount', 'notes',
      // Borrower & loan (migration format)
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer', 'secondary_officer',
      'original_loan_amount', 'principal_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'last_payment_date',
      'office_code',
      '1. guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2. guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
      'case_reference', 'case_status', 'collection_stage', 'collection_status',
    ];

    const d = (v: Date | string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';

    const rows = agreements.map((ag) => {
      const c = ag.case;
      const b = c.loan.borrower;
      const phones = b.phones ?? [];
      const parties = c.loan.relatedParties ?? [];
      const guarantors = parties.filter((rp) => rp.role === 'GUARANTOR');
      const coBorrower = parties.find((rp) => rp.role === 'CO_BORROWER');
      const g1 = guarantors[0]?.person;
      const g2 = guarantors[1]?.person;
      const co = coBorrower?.person;

      const paidCount = ag.installments.filter((i) => i.status === 'PAID' || i.status === 'WAIVED').length;
      const overdueCount = ag.installments.filter((i) => i.status === 'OVERDUE').length;
      const nextDue = ag.installments.find((i) => i.status === 'PENDING' || i.status === 'OVERDUE');

      return [
        ag.agreementReference,
        ag.status,
        Number(ag.totalAmount),
        ag.currency,
        ag.installmentCount,
        paidCount,
        overdueCount,
        d(ag.startDate),
        d(ag.endDate),
        nextDue ? d(nextDue.dueDate) : '',
        nextDue ? Number(nextDue.amount) : '',
        (ag.notes ?? '').replace(/"/g, '""'),
        b.personalId ?? '',
        b.fullName ?? '',
        phones[0]?.phoneNumber ?? '',
        phones[1]?.phoneNumber ?? '',
        b.address ?? '',
        b.city ?? '',
        c.loan.loanNumber ?? '',
        c.loan.institution?.name ?? '',
        c.assignedOfficer?.fullName ?? '',
        c.secondaryOfficer?.fullName ?? '',
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.currentOutstandingBalance ?? 0),
        (c.loan as any).productType ?? '',
        d((c.loan as any).disbursementDate),
        d(c.loan.lastPaymentDate),
        (c.office as any)?.code ?? '',
        g1?.personalId ?? '',
        g1?.fullName ?? '',
        g1?.phones?.[0]?.phoneNumber ?? '',
        g2?.personalId ?? '',
        g2?.fullName ?? '',
        g2?.phones?.[0]?.phoneNumber ?? '',
        co?.personalId ?? '',
        co?.fullName ?? '',
        co?.phones?.[0]?.phoneNumber ?? '',
        c.caseReference,
        c.status,
        c.collectionStage,
        (c as any).collectionStatus ?? '',
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Statusi Marrëveshjeve');

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `marreveshjet-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  // ─── Overdue Installments Excel ──────────────────────────────────────────────

  async overdueInstallmentsXlsx(query: { officerId?: string; officeId?: string; dateFrom?: string; dateTo?: string }, res: Response) {
    const agreementWhere: any = { status: { in: ['ACTIVE', 'BROKEN'] } };
    if (query.officerId) {
      agreementWhere.case = { assignedOfficerId: query.officerId };
    } else if (query.officeId) {
      agreementWhere.case = await this.officeCaseWhere(query.officeId);
    }

    const installmentWhere: any = { status: 'OVERDUE' };
    if (query.dateFrom || query.dateTo) {
      installmentWhere.dueDate = {};
      if (query.dateFrom) installmentWhere.dueDate.gte = new Date(query.dateFrom);
      if (query.dateTo)   installmentWhere.dueDate.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }

    const agreements = await this.prisma.agreement.findMany({
      where: { ...agreementWhere, installments: { some: installmentWhere } },
      include: {
        installments: { where: installmentWhere, orderBy: { dueDate: 'asc' } },
        case: {
          include: {
            loan: {
              include: {
                borrower: {
                  include: {
                    phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 2 },
                  },
                },
                institution: true,
                relatedParties: {
                  include: {
                    person: {
                      include: {
                        phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
                      },
                    },
                  },
                },
              },
            },
            assignedOfficer: { select: { id: true, fullName: true } },
            secondaryOfficer: { select: { id: true, fullName: true } },
            office: { select: { code: true, name: true } },
          },
        },
      },
    });

    const headers = [
      // Installment-specific
      'agreement_reference', 'agreement_status',
      'installment_number', 'due_date', 'installment_amount', 'currency', 'days_overdue',
      // Borrower & loan (migration format)
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer', 'secondary_officer',
      'original_loan_amount', 'principal_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'last_payment_date',
      'office_code',
      '1. guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2. guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
      'case_reference', 'case_status', 'collection_stage', 'collection_status',
    ];

    const d = (v: Date | string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const rows: any[][] = [];
    for (const ag of agreements) {
      const c = ag.case;
      const b = c.loan.borrower;
      const phones = b.phones ?? [];
      const parties = c.loan.relatedParties ?? [];
      const guarantors = parties.filter((rp) => rp.role === 'GUARANTOR');
      const coBorrower = parties.find((rp) => rp.role === 'CO_BORROWER');
      const g1 = guarantors[0]?.person;
      const g2 = guarantors[1]?.person;
      const co = coBorrower?.person;

      for (const ins of ag.installments) {
        const dueDate = new Date(ins.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
        rows.push([
          ag.agreementReference,
          ag.status,
          ins.installmentNumber,
          d(ins.dueDate),
          Number(ins.amount),
          ins.currency ?? ag.currency,
          daysOverdue,
          b.personalId ?? '',
          b.fullName ?? '',
          phones[0]?.phoneNumber ?? '',
          phones[1]?.phoneNumber ?? '',
          b.address ?? '',
          b.city ?? '',
          c.loan.loanNumber ?? '',
          c.loan.institution?.name ?? '',
          c.assignedOfficer?.fullName ?? '',
          c.secondaryOfficer?.fullName ?? '',
          Number(c.loan.originalLoanAmount ?? 0),
          Number(c.loan.originalLoanAmount ?? 0),
          Number(c.loan.currentOutstandingBalance ?? 0),
          (c.loan as any).productType ?? '',
          d((c.loan as any).disbursementDate),
          d(c.loan.lastPaymentDate),
          (c.office as any)?.code ?? '',
          g1?.personalId ?? '',
          g1?.fullName ?? '',
          g1?.phones?.[0]?.phoneNumber ?? '',
          g2?.personalId ?? '',
          g2?.fullName ?? '',
          g2?.phones?.[0]?.phoneNumber ?? '',
          co?.personalId ?? '',
          co?.fullName ?? '',
          co?.phones?.[0]?.phoneNumber ?? '',
          c.caseReference,
          c.status,
          c.collectionStage,
          (c as any).collectionStatus ?? '',
        ]);
      }
    }

    // Sort by days overdue descending (most overdue first)
    rows.sort((a, b) => (b[6] as number) - (a[6] as number));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Këste në Vonesë');

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `keste-vonese-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  // ─── Legal Cases Excel ───────────────────────────────────────────────────────

  async legalCasesXlsx(query: { officerId?: string; officeId?: string; dateFrom?: string; dateTo?: string }, res: Response) {
    const where: any = {};
    if (query.officerId) {
      where.case = { assignedOfficerId: query.officerId };
    } else if (query.officeId) {
      where.case = await this.officeCaseWhere(query.officeId);
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo)   where.createdAt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }

    const proceedings = await this.prisma.legalProceeding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        case: {
          include: {
            loan: {
              include: {
                borrower: {
                  include: {
                    phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 2 },
                  },
                },
                institution: true,
                relatedParties: {
                  include: {
                    person: {
                      include: {
                        phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
                      },
                    },
                  },
                },
              },
            },
            assignedOfficer: { select: { id: true, fullName: true } },
            secondaryOfficer: { select: { id: true, fullName: true } },
            office: { select: { code: true, name: true } },
          },
        },
      },
    });

    const headers = [
      // Legal proceeding-specific
      'proceeding_reference', 'legal_status', 'court', 'legal_case_number',
      'filing_date', 'initiation_date', 'next_hearing_date',
      'judgment_date', 'judgment_amount',
      'notes',
      // Borrower & loan (migration format)
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer', 'secondary_officer',
      'original_loan_amount', 'principal_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'last_payment_date',
      'office_code',
      '1. guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2. guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
      'case_reference', 'case_status', 'collection_stage', 'collection_status',
    ];

    const d = (v: Date | string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';

    const rows = proceedings.map((lp) => {
      const c = lp.case;
      const b = c.loan.borrower;
      const phones = b.phones ?? [];
      const parties = c.loan.relatedParties ?? [];
      const guarantors = parties.filter((rp) => rp.role === 'GUARANTOR');
      const coBorrower = parties.find((rp) => rp.role === 'CO_BORROWER');
      const g1 = guarantors[0]?.person;
      const g2 = guarantors[1]?.person;
      const co = coBorrower?.person;

      return [
        lp.proceedingRef,
        lp.status,
        lp.court ?? '',
        lp.legalCaseNumber ?? '',
        d(lp.filingDate),
        d(lp.initiationDate),
        d(lp.nextHearingDate),
        d(lp.judgmentDate),
        lp.judgmentAmount != null ? Number(lp.judgmentAmount) : '',
        (lp.notes ?? '').replace(/"/g, '""'),
        b.personalId ?? '',
        b.fullName ?? '',
        phones[0]?.phoneNumber ?? '',
        phones[1]?.phoneNumber ?? '',
        b.address ?? '',
        b.city ?? '',
        c.loan.loanNumber ?? '',
        c.loan.institution?.name ?? '',
        c.assignedOfficer?.fullName ?? '',
        c.secondaryOfficer?.fullName ?? '',
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.currentOutstandingBalance ?? 0),
        (c.loan as any).productType ?? '',
        d((c.loan as any).disbursementDate),
        d(c.loan.lastPaymentDate),
        (c.office as any)?.code ?? '',
        g1?.personalId ?? '',
        g1?.fullName ?? '',
        g1?.phones?.[0]?.phoneNumber ?? '',
        g2?.personalId ?? '',
        g2?.fullName ?? '',
        g2?.phones?.[0]?.phoneNumber ?? '',
        co?.personalId ?? '',
        co?.fullName ?? '',
        co?.phones?.[0]?.phoneNumber ?? '',
        c.caseReference,
        c.status,
        c.collectionStage,
        (c as any).collectionStatus ?? '',
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Dosjet Gjyqësore');

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `dosjet-gjyqesore-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  // ─── Activity Log Excel ──────────────────────────────────────────────────────

  async activityLogXlsx(query: { officerId?: string; officeId?: string; dateFrom?: string; dateTo?: string }, res: Response) {
    const where: any = {};
    if (query.officerId) {
      where.officerId = query.officerId;
    } else if (query.officeId) {
      where.case = await this.officeCaseWhere(query.officeId);
    }
    if (query.dateFrom || query.dateTo) {
      where.occurredAt = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo   && { lte: new Date(query.dateTo) }),
      };
    }

    const activities = await this.prisma.activity.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      include: {
        officer: { select: { id: true, fullName: true } },
        case: {
          include: {
            loan: {
              include: {
                borrower: {
                  include: {
                    phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 2 },
                  },
                },
                institution: true,
                relatedParties: {
                  include: {
                    person: {
                      include: {
                        phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
                      },
                    },
                  },
                },
              },
            },
            assignedOfficer: { select: { id: true, fullName: true } },
            secondaryOfficer: { select: { id: true, fullName: true } },
            office: { select: { code: true, name: true } },
          },
        },
      },
    });

    const headers = [
      // Activity-specific
      'activity_date', 'activity_type', 'channel', 'outcome',
      'promise_date', 'promise_amount', 'officer', 'notes',
      // Borrower & loan (migration format)
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer', 'secondary_officer',
      'original_loan_amount', 'principal_amount', 'current_outstanding_balance',
      'product_type', 'disbursement_date', 'last_payment_date',
      'office_code',
      '1. guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2. guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
      'case_reference', 'case_status', 'collection_stage', 'collection_status',
    ];

    const d = (v: Date | string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';

    const rows = activities.map((act) => {
      const c = act.case;
      const b = c.loan.borrower;
      const phones = b.phones ?? [];
      const parties = c.loan.relatedParties ?? [];
      const guarantors = parties.filter((rp) => rp.role === 'GUARANTOR');
      const coBorrower = parties.find((rp) => rp.role === 'CO_BORROWER');
      const g1 = guarantors[0]?.person;
      const g2 = guarantors[1]?.person;
      const co = coBorrower?.person;

      const isPromise = act.activityType === 'PROMISE_TO_PAY' || act.outcome === 'PROMISE_RECEIVED';
      return [
        d(act.occurredAt),
        act.activityType,
        act.channel ?? '',
        act.outcome ?? '',
        isPromise ? d(act.nextActionDate) : '',
        isPromise && act.promiseAmount != null ? Number(act.promiseAmount) : '',
        act.officer.fullName,
        (act.notes ?? '').replace(/"/g, '""'),
        b.personalId ?? '',
        b.fullName ?? '',
        phones[0]?.phoneNumber ?? '',
        phones[1]?.phoneNumber ?? '',
        b.address ?? '',
        b.city ?? '',
        c.loan.loanNumber ?? '',
        c.loan.institution?.name ?? '',
        c.assignedOfficer?.fullName ?? '',
        c.secondaryOfficer?.fullName ?? '',
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.currentOutstandingBalance ?? 0),
        (c.loan as any).productType ?? '',
        d((c.loan as any).disbursementDate),
        d(c.loan.lastPaymentDate),
        (c.office as any)?.code ?? '',
        g1?.personalId ?? '',
        g1?.fullName ?? '',
        g1?.phones?.[0]?.phoneNumber ?? '',
        g2?.personalId ?? '',
        g2?.fullName ?? '',
        g2?.phones?.[0]?.phoneNumber ?? '',
        co?.personalId ?? '',
        co?.fullName ?? '',
        co?.phones?.[0]?.phoneNumber ?? '',
        c.caseReference,
        c.status,
        c.collectionStage,
        (c as any).collectionStatus ?? '',
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Regjistri Aktiviteteve');

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `aktivitetet-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  // ─── Overdue Clients Excel ───────────────────────────────────────────────────

  async overdueClientsXlsx(query: { officerId?: string; officeId?: string }, res: Response) {
    const kosovoDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date());
    const today = new Date(kosovoDateStr + 'T00:00:00.000Z');

    const where: any = { deletedAt: null, status: { in: ['ACTIVE', 'LEGAL', 'SUSPENDED'] } };
    if (query.officerId) {
      where.assignedOfficerId = query.officerId;
    } else if (query.officeId) {
      const caseFilter = await this.officeCaseWhere(query.officeId);
      if (!where.AND) where.AND = [];
      where.AND.push(caseFilter);
    }
    // Only cases with overdue promises or overdue installments
    where.OR = [
      { promises: { some: { status: 'PENDING', promiseDate: { lt: today } } } },
      { agreements: { some: { status: { in: ['ACTIVE', 'BROKEN'] }, installments: { some: { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: today } } } } } },
    ];

    const cases = await this.prisma.case.findMany({
      where,
      orderBy: [{ priorityScore: 'desc' }, { updatedAt: 'desc' }],
      include: {
        loan: {
          include: {
            borrower: {
              include: {
                phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 2 },
              },
            },
            institution: true,
            relatedParties: {
              include: {
                person: {
                  include: {
                    phones: { where: { isActive: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
                  },
                },
              },
            },
          },
        },
        assignedOfficer: { select: { id: true, fullName: true } },
        secondaryOfficer: { select: { id: true, fullName: true } },
        office: { select: { code: true, name: true } },
        promises: { where: { status: 'PENDING', promiseDate: { lt: today } }, orderBy: { promiseDate: 'asc' }, take: 1 },
      },
    });

    const headers = [
      'personal_id', 'full_name',
      'phone1', 'phone2', 'address', 'city',
      'loan_number', 'institution_name',
      'assigned_officer', 'secondary_officer',
      'original_loan_amount', 'current_outstanding_balance',
      'last_payment_date', 'collection_stage', 'collection_status',
      'oldest_overdue_promise_date', 'oldest_overdue_promise_amount',
      'office_code',
      '1. guarantor_personal_id', '1. guarantor_first_last_name', '1. guarantor_phone',
      '2. guarantor_personal_id', '2. guarantor_first_last_name', '2. guarantor_phone',
      'co_borrower_personal_id', 'co_borrower_first_last_name', 'co_borrower_phone',
      'case_reference', 'case_status',
    ];

    const d = (v: Date | string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';

    const rows = cases.map((c) => {
      const b = c.loan.borrower;
      const phones = b.phones ?? [];
      const parties = c.loan.relatedParties ?? [];
      const guarantors = parties.filter((p) => p.role === 'GUARANTOR');
      const coBorrower = parties.find((p) => p.role === 'CO_BORROWER');
      const g1 = guarantors[0]?.person;
      const g2 = guarantors[1]?.person;
      const co = coBorrower?.person;
      const oldestPromise = (c as any).promises?.[0];

      return [
        b.personalId ?? '',
        b.fullName ?? '',
        phones[0]?.phoneNumber ?? '',
        phones[1]?.phoneNumber ?? '',
        b.address ?? '',
        b.city ?? '',
        c.loan.loanNumber ?? '',
        c.loan.institution?.name ?? '',
        c.assignedOfficer?.fullName ?? '',
        c.secondaryOfficer?.fullName ?? '',
        Number(c.loan.originalLoanAmount ?? 0),
        Number(c.loan.currentOutstandingBalance ?? 0),
        d(c.loan.lastPaymentDate),
        c.collectionStage,
        (c as any).collectionStatus ?? '',
        oldestPromise ? d(oldestPromise.promiseDate) : '',
        oldestPromise ? Number(oldestPromise.promisedAmount) : '',
        (c.office as any)?.code ?? '',
        g1?.personalId ?? '',
        g1?.fullName ?? '',
        g1?.phones?.[0]?.phoneNumber ?? '',
        g2?.personalId ?? '',
        g2?.fullName ?? '',
        g2?.phones?.[0]?.phoneNumber ?? '',
        co?.personalId ?? '',
        co?.fullName ?? '',
        co?.phones?.[0]?.phoneNumber ?? '',
        c.caseReference,
        c.status,
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Klientët në Vonesë');

    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `klientet-vonese-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  // ─── PDF helpers ─────────────────────────────────────────────────────────────

  private header(doc: PDFKit.PDFDocument, title: string) {
    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill(BRAND.primary);
    doc.fillColor(BRAND.white).fontSize(20).font('Helvetica-Bold')
      .text('DLR', 50, 22)
      .fontSize(10).font('Helvetica')
      .text('Debt & Loan Recovery Platform', 50, 46);
    doc.fontSize(14).font('Helvetica-Bold')
      .text(title, 200, 30, { align: 'right', width: doc.page.width - 250 });

    doc.fillColor(BRAND.text).moveDown(3);
  }

  private footer(doc: PDFKit.PDFDocument) {
    const y = doc.page.height - 40;
    doc.rect(0, y - 10, doc.page.width, 50).fill(BRAND.light);
    doc.fillColor(BRAND.muted).fontSize(8).font('Helvetica')
      .text(`Generated on ${new Date().toLocaleString('en-GB')} · DLR Platform · Confidential`, 50, y, { align: 'center', width: doc.page.width - 100 });
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(0.5);
    doc.rect(50, doc.y, doc.page.width - 100, 22).fill(BRAND.light);
    doc.fillColor(BRAND.mid).fontSize(10).font('Helvetica-Bold')
      .text(title, 58, doc.y - 17);
    doc.fillColor(BRAND.text).moveDown(0.8);
  }

  private twoCol(doc: PDFKit.PDFDocument, rows: [string, string][]) {
    const colW = (doc.page.width - 100) / 2;
    for (let i = 0; i < rows.length; i += 2) {
      const y = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.muted)
        .text(rows[i][0], 50, y, { width: 100 });
      doc.font('Helvetica').fillColor(BRAND.text)
        .text(rows[i][1], 155, y, { width: colW - 110 });
      if (rows[i + 1]) {
        doc.font('Helvetica-Bold').fillColor(BRAND.muted)
          .text(rows[i + 1][0], 50 + colW, y, { width: 100 });
        doc.font('Helvetica').fillColor(BRAND.text)
          .text(rows[i + 1][1], 155 + colW, y, { width: colW - 110 });
      }
      doc.moveDown(0.4);
    }
    doc.moveDown(0.3);
  }

  private table(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]) {
    const colW = (doc.page.width - 100) / headers.length;

    // Header row
    doc.rect(50, doc.y, doc.page.width - 100, 18).fill(BRAND.dark);
    const headerY = doc.y + 4;
    headers.forEach((h, i) => {
      doc.fillColor(BRAND.white).fontSize(8).font('Helvetica-Bold')
        .text(h, 50 + i * colW + 4, headerY, { width: colW - 8, ellipsis: true });
    });
    doc.moveDown(1.2);

    rows.forEach((row, ri) => {
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
        this.header(doc, '(continued)');
      }
      if (ri % 2 === 0) {
        doc.rect(50, doc.y - 3, doc.page.width - 100, 16).fill('#f9fafb');
      }
      const rowY = doc.y;
      row.forEach((cell, i) => {
        doc.fillColor(BRAND.text).fontSize(8).font('Helvetica')
          .text(cell, 50 + i * colW + 4, rowY, { width: colW - 8, ellipsis: true });
      });
      doc.moveDown(0.8);
    });
    doc.moveDown(0.5);
  }
}
