// Demo seed script — run once from Railway console: node /app/prisma/seed-demo.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function dateOnly(d) { return new Date(d.toISOString().split('T')[0]); }

async function main() {
  console.log('Seeding demo data...');

  // ── Offices ──────────────────────────────────────────────────────────────
  const [offTirana, offShkoder] = await Promise.all([
    p.office.upsert({ where: { code: 'TIR' }, update: {}, create: { name: 'Zyra Tiranë', code: 'TIR' } }),
    p.office.upsert({ where: { code: 'SHK' }, update: {}, create: { name: 'Zyra Shkodër', code: 'SHK' } }),
  ]);
  console.log('Offices done');

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = (pw) => bcrypt.hash(pw, 10);
  const [uAdmin, uManager1, uManager2, uOfficer1, uOfficer2, uOfficer3, uViewer] = await Promise.all([
    p.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', passwordHash: await hash('Admin123!'), fullName: 'Administrator', email: 'admin@dlr.com', role: 'ADMIN', isActive: true } }),
    p.user.upsert({ where: { username: 'manager.tirana' }, update: {}, create: { username: 'manager.tirana', passwordHash: await hash('Manager123!'), fullName: 'Arben Hoxha', email: 'a.hoxha@dlr.com', role: 'MANAGER', isActive: true, officeId: offTirana.id } }),
    p.user.upsert({ where: { username: 'manager.shkoder' }, update: {}, create: { username: 'manager.shkoder', passwordHash: await hash('Manager123!'), fullName: 'Mirela Gashi', email: 'm.gashi@dlr.com', role: 'MANAGER', isActive: true, officeId: offShkoder.id } }),
    p.user.upsert({ where: { username: 'officer.besnik' }, update: {}, create: { username: 'officer.besnik', passwordHash: await hash('Officer123!'), fullName: 'Besnik Kelmendi', email: 'b.kelmendi@dlr.com', role: 'OFFICER', isActive: true, officeId: offTirana.id } }),
    p.user.upsert({ where: { username: 'officer.diana' }, update: {}, create: { username: 'officer.diana', passwordHash: await hash('Officer123!'), fullName: 'Diana Shehu', email: 'd.shehu@dlr.com', role: 'OFFICER', isActive: true, officeId: offTirana.id } }),
    p.user.upsert({ where: { username: 'officer.fatos' }, update: {}, create: { username: 'officer.fatos', passwordHash: await hash('Officer123!'), fullName: 'Fatos Lleshi', email: 'f.lleshi@dlr.com', role: 'OFFICER', isActive: true, officeId: offShkoder.id } }),
    p.user.upsert({ where: { username: 'viewer1' }, update: {}, create: { username: 'viewer1', passwordHash: await hash('Viewer123!'), fullName: 'Elsa Dervishi', email: 'e.dervishi@dlr.com', role: 'VIEWER', isActive: true, officeId: offTirana.id } }),
  ]);
  console.log('Users done');

  // ── Institutions ──────────────────────────────────────────────────────────
  const [instBKT, instRaiffeisen, instCredicorp] = await Promise.all([
    p.institution.upsert({ where: { id: '11111111-1111-1111-1111-111111111111' }, update: {}, create: { id: '11111111-1111-1111-1111-111111111111', name: 'Banka Kombëtare Tregtare', shortName: 'BKT' } }),
    p.institution.upsert({ where: { id: '22222222-2222-2222-2222-222222222222' }, update: {}, create: { id: '22222222-2222-2222-2222-222222222222', name: 'Raiffeisen Bank Albania', shortName: 'RBA' } }),
    p.institution.upsert({ where: { id: '33333333-3333-3333-3333-333333333333' }, update: {}, create: { id: '33333333-3333-3333-3333-333333333333', name: 'Credicorp Bank', shortName: 'CCB' } }),
  ]);
  console.log('Institutions done');

  // ── Persons ───────────────────────────────────────────────────────────────
  const personsData = [
    { personalId: 'A12345678B', firstName: 'Ilir', lastName: 'Meta', city: 'Tiranë', email: 'i.meta@email.com', phone: '0691234567' },
    { personalId: 'B23456789C', firstName: 'Erjon', lastName: 'Braçe', city: 'Tiranë', email: 'e.brace@email.com', phone: '0692345678' },
    { personalId: 'C34567890D', firstName: 'Rudina', lastName: 'Hajdari', city: 'Durrës', email: 'r.hajdari@email.com', phone: '0693456789' },
    { personalId: 'D45678901E', firstName: 'Agron', lastName: 'Musaj', city: 'Vlorë', email: 'a.musaj@email.com', phone: '0694567890' },
    { personalId: 'E56789012F', firstName: 'Blerina', lastName: 'Çela', city: 'Shkodër', email: 'b.cela@email.com', phone: '0695678901' },
    { personalId: 'F67890123G', firstName: 'Klajdi', lastName: 'Basha', city: 'Tiranë', email: 'k.basha@email.com', phone: '0696789012' },
    { personalId: 'G78901234H', firstName: 'Ornela', lastName: 'Demaj', city: 'Elbasan', email: 'o.demaj@email.com', phone: '0697890123' },
    { personalId: 'H89012345I', firstName: 'Gentian', lastName: 'Sino', city: 'Korçë', email: 'g.sino@email.com', phone: '0698901234' },
    { personalId: 'I90123456J', firstName: 'Teuta', lastName: 'Arapi', city: 'Fier', email: 't.arapi@email.com', phone: '0699012345' },
    { personalId: 'J01234567K', firstName: 'Sokol', lastName: 'Olldashi', city: 'Tiranë', email: 's.olldashi@email.com', phone: '0691023456' },
    { personalId: 'K11234567L', firstName: 'Mirela', lastName: 'Kumbaro', city: 'Gjirokastër', email: 'm.kumbaro@email.com', phone: '0692134567' },
    { personalId: 'L21234567M', firstName: 'Arben', lastName: 'Ristani', city: 'Tiranë', email: 'a.ristani@email.com', phone: '0693214567' },
    { personalId: 'M31234567N', firstName: 'Silvana', lastName: 'Bega', city: 'Shkodër', email: 's.bega@email.com', phone: '0694321567' },
    { personalId: 'N41234567O', firstName: 'Dritan', lastName: 'Prifti', city: 'Lushnjë', email: 'd.prifti@email.com', phone: '0695432167' },
    { personalId: 'O51234567P', firstName: 'Anila', lastName: 'Ruçi', city: 'Tiranë', email: 'a.ruci@email.com', phone: '0696543217' },
    { personalId: 'P61234567Q', firstName: 'Taulant', lastName: 'Balla', city: 'Durrës', email: 't.balla@email.com', phone: '0697654321' },
    { personalId: 'Q71234567R', firstName: 'Valentina', lastName: 'Daka', city: 'Vlorë', email: 'v.daka@email.com', phone: '0698765432' },
    { personalId: 'R81234567S', firstName: 'Luan', lastName: 'Rama', city: 'Pogradec', email: 'l.rama@email.com', phone: '0699876543' },
    { personalId: 'S91234567T', firstName: 'Alma', lastName: 'Çupi', city: 'Tiranë', email: 'a.cupi@email.com', phone: '0691987654' },
    { personalId: 'T01234567U', firstName: 'Bujar', lastName: 'Nishani', city: 'Tiranë', email: 'b.nishani@email.com', phone: '0692098765' },
  ];

  const persons = [];
  for (const pd of personsData) {
    const person = await p.person.upsert({
      where: { personalId: pd.personalId },
      update: {},
      create: {
        personalId: pd.personalId, firstName: pd.firstName, lastName: pd.lastName,
        city: pd.city, email: pd.email,
        phones: { create: [{ phoneNumber: pd.phone, phoneType: 'MOBILE', isPrimary: true }] }
      }
    });
    persons.push(person);
  }
  console.log('Persons done');

  // ── Loans & Cases ─────────────────────────────────────────────────────────
  const loanConfigs = [
    { idx: 0, loanNum: 'BKT-2021-00101', inst: instBKT, amount: 15000, balance: 12400, dpd: 320, stage: 'D4', npl: 'LOSS', status: 'ACTIVE', officer: uOfficer1, office: offTirana },
    { idx: 1, loanNum: 'BKT-2022-00234', inst: instBKT, amount: 8500,  balance: 6200,  dpd: 180, stage: 'D3', npl: 'DOUBTFUL', status: 'ACTIVE', officer: uOfficer1, office: offTirana },
    { idx: 2, loanNum: 'RBA-2021-00089', inst: instRaiffeisen, amount: 25000, balance: 22100, dpd: 420, stage: 'LEGAL', npl: 'LOSS', status: 'LEGAL', officer: uOfficer2, office: offTirana },
    { idx: 3, loanNum: 'RBA-2022-00312', inst: instRaiffeisen, amount: 5000,  balance: 3800,  dpd: 95,  stage: 'D2', npl: 'SUBSTANDARD', status: 'ACTIVE', officer: uOfficer2, office: offTirana },
    { idx: 4, loanNum: 'CCB-2020-00056', inst: instCredicorp, amount: 40000, balance: 35600, dpd: 510, stage: 'LEGAL', npl: 'LOSS', status: 'LEGAL', officer: uOfficer3, office: offShkoder },
    { idx: 5, loanNum: 'BKT-2023-00445', inst: instBKT, amount: 3500,  balance: 2900,  dpd: 45,  stage: 'D1', npl: 'WATCH', status: 'ACTIVE', officer: uOfficer1, office: offTirana },
    { idx: 6, loanNum: 'RBA-2022-00567', inst: instRaiffeisen, amount: 12000, balance: 0,     dpd: 0,   stage: 'D2', npl: 'PERFORMING', status: 'CLOSED', officer: uOfficer2, office: offTirana },
    { idx: 7, loanNum: 'CCB-2021-00178', inst: instCredicorp, amount: 18000, balance: 14200, dpd: 240, stage: 'D3', npl: 'DOUBTFUL', status: 'ACTIVE', officer: uOfficer3, office: offShkoder },
    { idx: 8, loanNum: 'BKT-2022-00789', inst: instBKT, amount: 7200,  balance: 5100,  dpd: 130, stage: 'D2', npl: 'SUBSTANDARD', status: 'SUSPENDED', officer: uOfficer1, office: offTirana },
    { idx: 9, loanNum: 'RBA-2023-00234', inst: instRaiffeisen, amount: 9800,  balance: 8700,  dpd: 60,  stage: 'D1', npl: 'WATCH', status: 'ACTIVE', officer: uOfficer3, office: offShkoder },
    { idx: 10, loanNum: 'CCB-2022-00345', inst: instCredicorp, amount: 32000, balance: 28000, dpd: 380, stage: 'D4', npl: 'LOSS', status: 'ACTIVE', officer: uOfficer3, office: offShkoder },
    { idx: 11, loanNum: 'BKT-2021-00567', inst: instBKT, amount: 11000, balance: 9800,  dpd: 290, stage: 'D4', npl: 'DOUBTFUL', status: 'ACTIVE', officer: uOfficer2, office: offTirana },
    { idx: 12, loanNum: 'RBA-2022-00890', inst: instRaiffeisen, amount: 4500,  balance: 3200,  dpd: 75,  stage: 'D1', npl: 'WATCH', status: 'ACTIVE', officer: uOfficer1, office: offTirana },
    { idx: 13, loanNum: 'CCB-2023-00123', inst: instCredicorp, amount: 21000, balance: 0,     dpd: 0,   stage: 'D1', npl: 'PERFORMING', status: 'CLOSED', officer: uOfficer3, office: offShkoder },
    { idx: 14, loanNum: 'BKT-2022-00901', inst: instBKT, amount: 6700,  balance: 5500,  dpd: 155, stage: 'D3', npl: 'SUBSTANDARD', status: 'ACTIVE', officer: uOfficer2, office: offTirana },
    { idx: 15, loanNum: 'RBA-2021-00456', inst: instRaiffeisen, amount: 55000, balance: 48000, dpd: 460, stage: 'LEGAL', npl: 'LOSS', status: 'LEGAL', officer: uOfficer2, office: offTirana },
    { idx: 16, loanNum: 'CCB-2022-00678', inst: instCredicorp, amount: 8900,  balance: 7100,  dpd: 110, stage: 'D2', npl: 'SUBSTANDARD', status: 'ACTIVE', officer: uOfficer3, office: offShkoder },
    { idx: 17, loanNum: 'BKT-2023-00234', inst: instBKT, amount: 2800,  balance: 2500,  dpd: 30,  stage: 'D1', npl: 'WATCH', status: 'ACTIVE', officer: uOfficer1, office: offTirana },
    { idx: 18, loanNum: 'RBA-2022-00123', inst: instRaiffeisen, amount: 16500, balance: 13200, dpd: 200, stage: 'D3', npl: 'DOUBTFUL', status: 'ACTIVE', officer: uOfficer2, office: offTirana },
    { idx: 19, loanNum: 'CCB-2021-00890', inst: instCredicorp, amount: 29000, balance: 24500, dpd: 350, stage: 'D4', npl: 'LOSS', status: 'ACTIVE', officer: uOfficer3, office: offShkoder },
  ];

  const cases = [];
  for (const lc of loanConfigs) {
    const person = persons[lc.idx % persons.length];
    const disbDate = dateOnly(daysAgo(600 + lc.idx * 15));
    const loan = await p.loan.upsert({
      where: { loanNumber: lc.loanNum },
      update: { currentOutstandingBalance: lc.balance, daysPastDue: lc.dpd },
      create: {
        loanNumber: lc.loanNum,
        institutionId: lc.inst.id,
        borrowerId: person.id,
        originalLoanAmount: lc.amount,
        disbursedAmount: lc.amount,
        currentOutstandingBalance: lc.balance,
        currency: 'EUR',
        interestRate: 0.065,
        productType: lc.amount > 20000 ? 'Kredi Biznesi' : 'Kredi Konsumi',
        disbursementDate: disbDate,
        maturityDate: dateOnly(daysFromNow(365 - lc.idx * 10)),
        lastPaymentDate: lc.dpd > 0 ? dateOnly(daysAgo(lc.dpd + 10)) : dateOnly(daysAgo(5)),
        daysPastDue: lc.dpd,
        nplClassification: lc.npl,
      }
    });

    const caseRef = `DLR-2024-${String(lc.idx + 1).padStart(4, '0')}`;
    let caseRecord = await p.case.findFirst({ where: { caseReference: caseRef } });
    if (!caseRecord) {
      caseRecord = await p.case.create({
        data: {
          caseReference: caseRef,
          loanId: loan.id,
          officeId: lc.office.id,
          assignedOfficerId: lc.officer.id,
          status: lc.status,
          collectionStage: lc.stage,
          priorityScore: Math.min(100, Math.floor(lc.dpd / 5)),
          nextActionDate: lc.status === 'ACTIVE' ? daysFromNow(3 + lc.idx) : null,
          nextActionNote: lc.status === 'ACTIVE' ? 'Kontakto debitorin për marrëveshje pagese' : null,
          closedAt: lc.status === 'CLOSED' ? daysAgo(30 + lc.idx * 3) : null,
          createdAt: daysAgo(180 + lc.idx * 7),
        }
      });
    }
    cases.push({ caseRecord, loan, person, lc });
  }
  console.log('Loans & Cases done');

  // ── Activities ────────────────────────────────────────────────────────────
  const activityTemplates = [
    { type: 'CALL', outcome: 'CONTACTED', notes: 'Debitori u kontaktua. Premtoi pagesë brenda 7 ditëve.' },
    { type: 'CALL', outcome: 'NO_ANSWER', notes: 'Nuk u përgjigj. Do të riprovohet nesër.' },
    { type: 'VISIT', outcome: 'CONTACTED', notes: 'Vizitë në shtëpi. Debitori konfirmoi vështirësi financiare.' },
    { type: 'SMS', outcome: null, notes: 'SMS-i i njoftimit u dërgua me sukses.' },
    { type: 'EMAIL', outcome: 'REFUSED', notes: 'Debitori refuzoi të paguajë duke pretenduar gabim banke.' },
    { type: 'CALL', outcome: 'PROMISE_RECEIVED', notes: 'Premtim pagese prej 500 EUR brenda 5 ditëve.' },
    { type: 'FIELD_VISIT', outcome: 'CONTACTED', notes: 'Vizitë në punë. Punëdhënësi konfirmoi punësimin.' },
    { type: 'NOTE', outcome: null, notes: 'Debitori ka lëvizur adresë. Po kërkojmë adresën e re.' },
    { type: 'CALL', outcome: 'PARTIAL_PAYMENT', notes: 'Pagesa e pjesshme prej 200 EUR u pranua.' },
    { type: 'LETTER', outcome: null, notes: 'Letër zyrtar njoftimi u dërgua me postë.' },
  ];

  for (const { caseRecord, lc } of cases) {
    const numActs = 2 + (lc.idx % 4);
    for (let i = 0; i < numActs; i++) {
      const tmpl = activityTemplates[(lc.idx + i) % activityTemplates.length];
      await p.activity.create({
        data: {
          caseId: caseRecord.id,
          officerId: lc.officer.id,
          activityType: tmpl.type,
          outcome: tmpl.outcome,
          notes: tmpl.notes,
          occurredAt: daysAgo(10 + i * 5 + lc.idx),
          nextActionDate: i === numActs - 1 ? daysFromNow(5) : null,
        }
      });
    }
  }
  console.log('Activities done');

  // ── Payments ──────────────────────────────────────────────────────────────
  const paymentMethods = ['BANK_TRANSFER', 'CASH', 'CARD', 'MOBILE'];
  for (const { caseRecord, lc } of cases) {
    if (lc.status === 'CLOSED' || lc.idx % 3 !== 0) {
      const numPays = lc.status === 'CLOSED' ? 3 : 1;
      for (let i = 0; i < numPays; i++) {
        const payRef = `PAY-${lc.loanNum.replace(/-/g,'')}-${i+1}`;
        await p.payment.upsert({
          where: { paymentReference: payRef },
          update: {},
          create: {
            caseId: caseRecord.id,
            officerId: lc.officer.id,
            paymentReference: payRef,
            amount: lc.status === 'CLOSED' ? (lc.amount / 3).toFixed(2) : (200 + lc.idx * 50),
            currency: 'EUR',
            paymentDate: dateOnly(daysAgo(20 + i * 15 + lc.idx)),
            paymentMethod: paymentMethods[lc.idx % paymentMethods.length],
            notes: 'Pagesë e regjistruar nga oficeri',
          }
        });
      }
    }
  }
  console.log('Payments done');

  // ── Promises to Pay ───────────────────────────────────────────────────────
  const promiseStatuses = ['PENDING', 'KEPT', 'BROKEN', 'PARTIAL'];
  for (const { caseRecord, person, lc } of cases) {
    if (lc.status === 'ACTIVE' && lc.idx % 2 === 0) {
      await p.promiseToPay.create({
        data: {
          caseId: caseRecord.id,
          personId: person.id,
          createdById: lc.officer.id,
          promisedAmount: 500 + lc.idx * 100,
          currency: 'EUR',
          promiseDate: dateOnly(daysFromNow(7 + lc.idx)),
          status: promiseStatuses[lc.idx % promiseStatuses.length],
          notes: 'Premtim verbal nga debitori gjatë kontaktit telefonik.',
        }
      });
    }
  }
  console.log('Promises done');

  // ── Agreements ────────────────────────────────────────────────────────────
  for (const { caseRecord, lc } of cases) {
    if (lc.status === 'ACTIVE' && lc.dpd > 100 && lc.idx % 3 === 0) {
      const agRef = `AGR-2024-${String(lc.idx + 1).padStart(3, '0')}`;
      const existing = await p.agreement.findFirst({ where: { agreementReference: agRef } });
      if (!existing) {
        const totalAmt = lc.balance * 0.8;
        const installments = 6;
        const instAmt = (totalAmt / installments).toFixed(2);
        const agr = await p.agreement.create({
          data: {
            caseId: caseRecord.id,
            createdById: lc.officer.id,
            agreementReference: agRef,
            status: 'ACTIVE',
            totalAmount: totalAmt,
            currency: 'EUR',
            installmentCount: installments,
            startDate: dateOnly(daysAgo(30)),
            endDate: dateOnly(daysFromNow(150)),
            notes: 'Marrëveshje ristrukturimi borxhi e nënshkruar nga palët.',
            installments: {
              create: Array.from({ length: installments }, (_, i) => ({
                installmentNumber: i + 1,
                dueDate: dateOnly(daysFromNow((i + 1) * 25)),
                amount: instAmt,
                currency: 'EUR',
                status: i === 0 ? 'PAID' : (i === 1 && lc.idx % 5 === 0 ? 'OVERDUE' : 'PENDING'),
                paidAt: i === 0 ? dateOnly(daysAgo(5)) : null,
                paidAmount: i === 0 ? instAmt : null,
              }))
            }
          }
        });
      }
    }
  }
  console.log('Agreements done');

  // ── Legal Proceedings ─────────────────────────────────────────────────────
  const legalStatuses = ['INITIATED', 'IN_PROGRESS', 'JUDGMENT', 'ENFORCEMENT'];
  for (const { caseRecord, lc } of cases) {
    if (lc.status === 'LEGAL') {
      const procRef = `LEG-2024-${String(lc.idx + 1).padStart(3, '0')}`;
      const existing = await p.legalProceeding.findFirst({ where: { proceedingRef: procRef } });
      if (!existing) {
        const legalStatus = legalStatuses[lc.idx % legalStatuses.length];
        const proc = await p.legalProceeding.create({
          data: {
            caseId: caseRecord.id,
            createdById: uManager1.id,
            proceedingRef: procRef,
            status: legalStatus,
            court: lc.idx % 2 === 0 ? 'Gjykata e Rrethit Gjyqësor Tiranë' : 'Gjykata e Apelit Tiranë',
            filingDate: dateOnly(daysAgo(90 + lc.idx * 5)),
            nextHearingDate: legalStatus !== 'JUDGMENT' && legalStatus !== 'ENFORCEMENT' ? dateOnly(daysFromNow(30)) : null,
            judgmentDate: legalStatus === 'JUDGMENT' || legalStatus === 'ENFORCEMENT' ? dateOnly(daysAgo(15)) : null,
            judgmentAmount: legalStatus === 'JUDGMENT' || legalStatus === 'ENFORCEMENT' ? lc.balance * 1.1 : null,
            notes: 'Procedura ligjore e iniciuar pas dështimit të gjithë tentativave administrative.',
          }
        });

        await p.legalActivity.create({
          data: {
            legalProceedingId: proc.id,
            createdById: uManager1.id,
            activityType: 'SUBMISSION',
            activityDate: dateOnly(daysAgo(90 + lc.idx * 5)),
            description: 'Depozitimi i kërkesës dhe dokumentacionit pranë gjykatës.',
          }
        });

        if (legalStatus !== 'INITIATED') {
          await p.legalActivity.create({
            data: {
              legalProceedingId: proc.id,
              createdById: uManager1.id,
              activityType: 'HEARING',
              activityDate: dateOnly(daysAgo(45)),
              description: 'Seanca e parë gjyqësore. Gjykata vendosi vazhdimin e procedurës.',
              deadline: dateOnly(daysFromNow(30)),
            }
          });
        }
      }
    }
  }
  console.log('Legal proceedings done');

  // ── Case Status History ───────────────────────────────────────────────────
  for (const { caseRecord, lc } of cases.slice(0, 8)) {
    await p.caseStatusHistory.create({
      data: {
        caseId: caseRecord.id,
        changedById: uAdmin.id,
        field: 'collectionStage',
        oldValue: 'D1',
        newValue: lc.stage,
        note: 'Përditësim automatik bazuar në ditët e vonimit.',
        changedAt: daysAgo(60 + lc.idx * 3),
      }
    });
  }
  console.log('Status history done');

  console.log('\n✓ Demo data seeded successfully!');
  console.log('  Offices: 2 | Users: 7 | Institutions: 3 | Cases: 20');
  console.log('  Passwords: Admin123! / Manager123! / Officer123! / Viewer123!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
