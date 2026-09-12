"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
async function main() {
    console.log('Duke ngarkuar të dhënat fillestare...');
    const prn = await prisma.office.upsert({ where: { code: 'PRN' }, update: {}, create: { name: 'Prishtinë', code: 'PRN' } });
    const prz = await prisma.office.upsert({ where: { code: 'PRZ' }, update: {}, create: { name: 'Prizren', code: 'PRZ' } });
    const pej = await prisma.office.upsert({ where: { code: 'PEJ' }, update: {}, create: { name: 'Pejë', code: 'PEJ' } });
    const gjk = await prisma.office.upsert({ where: { code: 'GJK' }, update: {}, create: { name: 'Gjakovë', code: 'GJK' } });
    const frz = await prisma.office.upsert({ where: { code: 'FRZ' }, update: {}, create: { name: 'Ferizaj', code: 'FRZ' } });
    const mit = await prisma.office.upsert({ where: { code: 'MIT' }, update: {}, create: { name: 'Mitrovicë', code: 'MIT' } });
    const hash = await bcrypt.hash('admin123', 12);
    await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', passwordHash: hash, fullName: 'Arben Krasniqi', email: 'admin@dlr.com', role: client_1.UserRole.ADMIN, officeId: prn.id } });
    await prisma.user.upsert({ where: { username: 'b.vitia' }, update: {}, create: { username: 'b.vitia', passwordHash: hash, fullName: 'Besnik Vitia', email: 'b.vitia@dlr.com', role: client_1.UserRole.MANAGER, officeId: prn.id } });
    await prisma.user.upsert({ where: { username: 'f.osmani' }, update: {}, create: { username: 'f.osmani', passwordHash: hash, fullName: 'Flutura Osmani', email: 'f.osmani@dlr.com', role: client_1.UserRole.MANAGER, officeId: prz.id } });
    const rgashi = await prisma.user.upsert({ where: { username: 'r.gashi' }, update: {}, create: { username: 'r.gashi', passwordHash: hash, fullName: 'Rinor Gashi', email: 'r.gashi@dlr.com', role: client_1.UserRole.OFFICER, officeId: prn.id } });
    const ahoxha = await prisma.user.upsert({ where: { username: 'a.hoxha' }, update: {}, create: { username: 'a.hoxha', passwordHash: hash, fullName: 'Arlinda Hoxha', email: 'a.hoxha@dlr.com', role: client_1.UserRole.OFFICER, officeId: prn.id } });
    const lkelmendi = await prisma.user.upsert({ where: { username: 'l.kelmendi' }, update: {}, create: { username: 'l.kelmendi', passwordHash: hash, fullName: 'Liridon Kelmendi', email: 'l.kelmendi@dlr.com', role: client_1.UserRole.OFFICER, officeId: prz.id } });
    const vberisha = await prisma.user.upsert({ where: { username: 'v.berisha' }, update: {}, create: { username: 'v.berisha', passwordHash: hash, fullName: 'Valon Berisha', email: 'v.berisha@dlr.com', role: client_1.UserRole.OFFICER, officeId: pej.id } });
    const smorina = await prisma.user.upsert({ where: { username: 's.morina' }, update: {}, create: { username: 's.morina', passwordHash: hash, fullName: 'Sara Morina', email: 's.morina@dlr.com', role: client_1.UserRole.OFFICER, officeId: gjk.id } });
    const ehalili = await prisma.user.upsert({ where: { username: 'e.halili' }, update: {}, create: { username: 'e.halili', passwordHash: hash, fullName: 'Egzon Halili', email: 'e.halili@dlr.com', role: client_1.UserRole.OFFICER, officeId: frz.id } });
    const dbajrami = await prisma.user.upsert({ where: { username: 'd.bajrami' }, update: {}, create: { username: 'd.bajrami', passwordHash: hash, fullName: 'Drita Bajrami', email: 'd.bajrami@dlr.com', role: client_1.UserRole.OFFICER, officeId: mit.id } });
    const nrugova = await prisma.user.upsert({ where: { username: 'n.rugova' }, update: {}, create: { username: 'n.rugova', passwordHash: hash, fullName: 'Naim Rugova', email: 'n.rugova@dlr.com', role: client_1.UserRole.OFFICER, officeId: prn.id } });
    await prisma.user.upsert({ where: { username: 'viewer' }, update: {}, create: { username: 'viewer', passwordHash: hash, fullName: 'Mentor Aliu', email: 'm.aliu@dlr.com', role: client_1.UserRole.VIEWER, officeId: prn.id } });
    const pcb = await prisma.institution.upsert({ where: { id: '00000000-0000-0000-0000-000000000001' }, update: {}, create: { id: '00000000-0000-0000-0000-000000000001', name: 'ProCredit Bank Kosovë', shortName: 'PCB' } });
    const bpb = await prisma.institution.upsert({ where: { id: '00000000-0000-0000-0000-000000000002' }, update: {}, create: { id: '00000000-0000-0000-0000-000000000002', name: 'Banka për Biznes', shortName: 'BpB' } });
    const rbk = await prisma.institution.upsert({ where: { id: '00000000-0000-0000-0000-000000000003' }, update: {}, create: { id: '00000000-0000-0000-0000-000000000003', name: 'Raiffeisen Bank Kosovë', shortName: 'RBK' } });
    const nlb = await prisma.institution.upsert({ where: { id: '00000000-0000-0000-0000-000000000004' }, update: {}, create: { id: '00000000-0000-0000-0000-000000000004', name: 'NLB Banka', shortName: 'NLB' } });
    const meb = await prisma.institution.upsert({ where: { id: '00000000-0000-0000-0000-000000000005' }, update: {}, create: { id: '00000000-0000-0000-0000-000000000005', name: 'Micro Enterprise Bank', shortName: 'MEB' } });
    const kep = await prisma.institution.upsert({ where: { id: '00000000-0000-0000-0000-000000000006' }, update: {}, create: { id: '00000000-0000-0000-0000-000000000006', name: 'KEP Trust', shortName: 'KEP' } });
    const personRows = [
        { personalId: '1001001001', firstName: 'Milaim', lastName: 'Berisha', phone1: '+383 44 123 456', phone2: '+383 49 111 222', city: 'Prishtinë', address: 'Rr. Nënë Tereza 12' },
        { personalId: '1002002002', firstName: 'Faton', lastName: 'Morina', phone1: '+383 45 234 567', city: 'Prizren', address: 'Rr. Shën Flori 5' },
        { personalId: '1003003003', firstName: 'Vjosa', lastName: 'Hyseni', phone1: '+383 44 345 678', city: 'Pejë', address: 'Rr. UÇK 33' },
        { personalId: '1004004004', firstName: 'Blerim', lastName: 'Aliu', phone1: '+383 45 456 789', city: 'Gjakovë', address: 'Rr. Çabrati 8' },
        { personalId: '1005005005', firstName: 'Arjeta', lastName: 'Lumi', phone1: '+383 44 567 890', city: 'Ferizaj', address: 'Rr. Dëshmorët 21' },
        { personalId: '1006006006', firstName: 'Nexhat', lastName: 'Osmani', phone1: '+383 45 678 901', city: 'Prishtinë', address: 'Rr. Agim Ramadani 7' },
        { personalId: '1007007007', firstName: 'Shpend', lastName: 'Krasniqi', phone1: '+383 44 789 012', city: 'Prishtinë', address: 'Rr. Garibaldi 15' },
        { personalId: '1008008008', firstName: 'Drita', lastName: 'Bajrami', phone1: '+383 45 890 123', city: 'Prizren', address: 'Rr. Remzi Ademi 4' },
        { personalId: '1009009009', firstName: 'Agim', lastName: 'Halili', phone1: '+383 44 901 234', city: 'Pejë', address: 'Rr. Iliria 19' },
        { personalId: '1010010010', firstName: 'Zana', lastName: 'Gashi', phone1: '+383 45 012 345', city: 'Prishtinë', address: 'Rr. Bill Klinton 3' },
        { personalId: '1011011011', firstName: 'Kujtim', lastName: 'Xhaferi', phone1: '+383 44 111 222', city: 'Mitrovicë', address: 'Rr. Skënderbeu 44' },
        { personalId: '1012012012', firstName: 'Lumnije', lastName: 'Rugova', phone1: '+383 45 222 333', city: 'Prishtinë', address: 'Rr. Qamil Hoxha 6' },
        { personalId: '1013013013', firstName: 'Burim', lastName: 'Gërguri', phone1: '+383 44 333 444', city: 'Prizren', address: 'Rr. Luan Haradinaj 11' },
        { personalId: '1014014014', firstName: 'Teuta', lastName: 'Avdiu', phone1: '+383 45 444 555', city: 'Gjakovë', address: 'Rr. Fehmi Agani 9' },
        { personalId: '1015015015', firstName: 'Enis', lastName: 'Shala', phone1: '+383 44 555 666', city: 'Ferizaj', address: 'Rr. Ibrahim Rugova 28' },
        { personalId: '1016016016', firstName: 'Albana', lastName: 'Koci', phone1: '+383 45 666 777', city: 'Pejë', address: 'Rr. Adem Jashari 55' },
        { personalId: '1017017017', firstName: 'Meriton', lastName: 'Mustafa', phone1: '+383 44 777 888', city: 'Prishtinë', address: 'Rr. Luan Haradinaj 3' },
        { personalId: '1018018018', firstName: 'Donika', lastName: 'Zeqiri', phone1: '+383 45 888 999', city: 'Mitrovicë', address: 'Rr. Partizanëve 17' },
        { personalId: '1019019019', firstName: 'Flamur', lastName: 'Rexhepi', phone1: '+383 44 999 000', city: 'Prizren', address: 'Rr. Vëllaznim 22' },
        { personalId: '1020020020', firstName: 'Hana', lastName: 'Pllana', phone1: '+383 45 000 111', city: 'Prishtinë', address: 'Rr. Muharrem Fejza 14' },
        { personalId: '1021021021', firstName: 'Agron', lastName: 'Sejdiu', phone1: '+383 44 121 212', city: 'Gjakovë', address: 'Rr. Eqrem Qabej 30' },
        { personalId: '1022022022', firstName: 'Leonora', lastName: 'Thaçi', phone1: '+383 45 232 323', city: 'Ferizaj', address: 'Rr. Dardania 7' },
        { personalId: '1023023023', firstName: 'Petrit', lastName: 'Cana', phone1: '+383 44 343 434', city: 'Pejë', address: 'Rr. Skënderbeu 2' },
        { personalId: '1024024024', firstName: 'Mirjeta', lastName: 'Vokshi', phone1: '+383 45 454 545', city: 'Prishtinë', address: 'Rr. Frang Bardhi 8' },
        { personalId: '1025025025', firstName: 'Gazmend', lastName: 'Latifi', phone1: '+383 44 565 656', city: 'Mitrovicë', address: 'Rr. Ismail Qemali 16' },
    ];
    const persons = [];
    for (const p of personRows) {
        const person = await prisma.person.upsert({ where: { personalId: p.personalId }, update: {}, create: p });
        persons.push(person);
    }
    const rates = [0.085, 0.090, 0.075, 0.100, 0.080, 0.115, 0.095, 0.070, 0.085, 0.105, 0.090, 0.080, 0.110, 0.075, 0.095, 0.100, 0.085, 0.090, 0.075, 0.080, 0.105, 0.095, 0.080, 0.110, 0.090];
    const products = ['PERSONAL', 'MORTGAGE', 'BUSINESS', 'AUTO', 'PERSONAL', 'BUSINESS', 'PERSONAL', 'MORTGAGE', 'AUTO', 'PERSONAL', 'BUSINESS', 'PERSONAL', 'AUTO', 'MORTGAGE', 'PERSONAL', 'BUSINESS', 'AUTO', 'PERSONAL', 'BUSINESS', 'PERSONAL', 'AUTO', 'MORTGAGE', 'PERSONAL', 'BUSINESS', 'AUTO'];
    const nplFor = (dpd) => dpd > 360 ? 'LOSS' : dpd > 180 ? 'DOUBTFUL' : dpd > 90 ? 'SUBSTANDARD' : 'WATCH';
    const caseDefinitions = [
        { ln: 'PCB-2024-0041', inst: pcb, bIdx: 0, amt: 4500, out: 3800, dpd: 18, stage: client_1.CollectionStage.D1, office: prn, officer: rgashi, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 420 },
        { ln: 'BPB-2024-0188', inst: bpb, bIdx: 1, amt: 2800, out: 2650, dpd: 25, stage: client_1.CollectionStage.D1, office: prz, officer: lkelmendi, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 540 },
        { ln: 'NLB-2024-0077', inst: nlb, bIdx: 10, amt: 6200, out: 5900, dpd: 31, stage: client_1.CollectionStage.D1, office: mit, officer: dbajrami, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 660 },
        { ln: 'RBK-2023-0092', inst: rbk, bIdx: 2, amt: 9800, out: 7400, dpd: 58, stage: client_1.CollectionStage.D2, office: pej, officer: vberisha, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 840 },
        { ln: 'PCB-2023-0120', inst: pcb, bIdx: 3, amt: 5000, out: 4200, dpd: 72, stage: client_1.CollectionStage.D2, office: gjk, officer: smorina, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 600 },
        { ln: 'MEB-2023-0234', inst: meb, bIdx: 11, amt: 3400, out: 3100, dpd: 65, stage: client_1.CollectionStage.D2, office: prn, officer: ahoxha, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 480 },
        { ln: 'KEP-2023-0055', inst: kep, bIdx: 12, amt: 1800, out: 1650, dpd: 88, stage: client_1.CollectionStage.D2, office: prz, officer: lkelmendi, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 360 },
        { ln: 'PCB-2022-0041', inst: pcb, bIdx: 4, amt: 8500, out: 6900, dpd: 128, stage: client_1.CollectionStage.D3, office: frz, officer: ehalili, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 900 },
        { ln: 'BPB-2022-0341', inst: bpb, bIdx: 13, amt: 12000, out: 10800, dpd: 145, stage: client_1.CollectionStage.D3, office: prn, officer: rgashi, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 1080 },
        { ln: 'RBK-2022-0108', inst: rbk, bIdx: 14, amt: 7200, out: 6500, dpd: 162, stage: client_1.CollectionStage.D3, office: pej, officer: vberisha, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 720 },
        { ln: 'NLB-2023-0019', inst: nlb, bIdx: 15, amt: 4800, out: 4400, dpd: 110, stage: client_1.CollectionStage.D3, office: gjk, officer: smorina, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 540 },
        { ln: 'PCB-2022-0091', inst: pcb, bIdx: 5, amt: 18500, out: 16200, dpd: 198, stage: client_1.CollectionStage.D4, office: prn, officer: nrugova, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 1260 },
        { ln: 'BPB-2021-0887', inst: bpb, bIdx: 16, amt: 22000, out: 20100, dpd: 215, stage: client_1.CollectionStage.D4, office: prn, officer: ahoxha, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 1440 },
        { ln: 'MEB-2022-0143', inst: meb, bIdx: 17, amt: 9500, out: 8800, dpd: 244, stage: client_1.CollectionStage.D4, office: mit, officer: dbajrami, status: client_1.CaseStatus.ACTIVE, disbDaysAgo: 1140 },
        { ln: 'PCB-2021-0887', inst: pcb, bIdx: 6, amt: 28000, out: 26500, dpd: 380, stage: client_1.CollectionStage.LEGAL, office: prn, officer: nrugova, status: client_1.CaseStatus.LEGAL, disbDaysAgo: 1680 },
        { ln: 'RBK-2021-0204', inst: rbk, bIdx: 7, amt: 15000, out: 14200, dpd: 310, stage: client_1.CollectionStage.LEGAL, office: prn, officer: ahoxha, status: client_1.CaseStatus.LEGAL, disbDaysAgo: 1500 },
        { ln: 'NLB-2020-0033', inst: nlb, bIdx: 18, amt: 45000, out: 43000, dpd: 425, stage: client_1.CollectionStage.LEGAL, office: prz, officer: lkelmendi, status: client_1.CaseStatus.LEGAL, disbDaysAgo: 1860 },
        { ln: 'BPB-2021-0321', inst: bpb, bIdx: 19, amt: 11000, out: 10200, dpd: 295, stage: client_1.CollectionStage.LEGAL, office: frz, officer: ehalili, status: client_1.CaseStatus.LEGAL, disbDaysAgo: 1560 },
        { ln: 'PCB-2023-0391', inst: pcb, bIdx: 8, amt: 5500, out: 0, dpd: 0, stage: client_1.CollectionStage.D1, office: pej, officer: vberisha, status: client_1.CaseStatus.CLOSED, disbDaysAgo: 780 },
        { ln: 'RBK-2022-0511', inst: rbk, bIdx: 9, amt: 3800, out: 0, dpd: 0, stage: client_1.CollectionStage.D2, office: prn, officer: rgashi, status: client_1.CaseStatus.CLOSED, disbDaysAgo: 960 },
        { ln: 'MEB-2023-0099', inst: meb, bIdx: 20, amt: 2200, out: 0, dpd: 0, stage: client_1.CollectionStage.D1, office: prz, officer: lkelmendi, status: client_1.CaseStatus.CLOSED, disbDaysAgo: 420 },
        { ln: 'BPB-2019-0024', inst: bpb, bIdx: 21, amt: 32000, out: 32000, dpd: 680, stage: client_1.CollectionStage.D4, office: gjk, officer: smorina, status: client_1.CaseStatus.WRITTEN_OFF, disbDaysAgo: 2400 },
        { ln: 'PCB-2020-0177', inst: pcb, bIdx: 22, amt: 18000, out: 18000, dpd: 540, stage: client_1.CollectionStage.D4, office: mit, officer: dbajrami, status: client_1.CaseStatus.WRITTEN_OFF, disbDaysAgo: 2160 },
        { ln: 'KEP-2022-0044', inst: kep, bIdx: 23, amt: 7800, out: 6200, dpd: 88, stage: client_1.CollectionStage.D2, office: prn, officer: nrugova, status: client_1.CaseStatus.SUSPENDED, disbDaysAgo: 600 },
        { ln: 'NLB-2023-0155', inst: nlb, bIdx: 24, amt: 13500, out: 11000, dpd: 155, stage: client_1.CollectionStage.D3, office: pej, officer: vberisha, status: client_1.CaseStatus.SUSPENDED, disbDaysAgo: 1020 },
    ];
    const allCases = [];
    for (let i = 0; i < caseDefinitions.length; i++) {
        const d = caseDefinitions[i];
        const disbDate = daysAgo(d.disbDaysAgo);
        const loan = await prisma.loan.upsert({
            where: { loanNumber: d.ln },
            update: {},
            create: {
                loanNumber: d.ln,
                institutionId: d.inst.id,
                borrowerId: persons[d.bIdx].id,
                originalLoanAmount: d.amt,
                disbursedAmount: d.amt,
                currentOutstandingBalance: d.out,
                disbursementDate: disbDate,
                maturityDate: new Date(disbDate.getTime() + 5 * 365 * 24 * 60 * 60 * 1000),
                daysPastDue: d.dpd,
                nplClassification: nplFor(d.dpd),
                productType: products[i],
                interestRate: rates[i],
            },
        });
        const yr = 2022 + Math.floor(i / 8);
        const caseRef = `DLR-${yr}-${String(i + 1).padStart(4, '0')}`;
        const existingCase = await prisma.case.findUnique({ where: { loanId: loan.id } });
        if (existingCase) {
            allCases.push({ c: existingCase, d, caseRef });
            continue;
        }
        const c = await prisma.case.create({
            data: {
                caseReference: caseRef,
                loanId: loan.id,
                officeId: d.office.id,
                assignedOfficerId: d.officer.id,
                status: d.status,
                collectionStage: d.stage,
                priorityScore: d.dpd,
                nextActionDate: d.status === client_1.CaseStatus.ACTIVE ? daysFromNow(3 + (i % 7)) : null,
            },
        });
        allCases.push({ c, d, caseRef });
    }
    const activityTemplates = [
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.CONTACTED, notes: 'Folëm me debitorin. Ka premtuar pagesën deri në fund të muajit. Është kooperativ dhe ka konfirmuar gjendjen e borxhit.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.CONTACTED, notes: 'Debitori ka njohuri për borxhin. Ka thënë se pret pagën dhe do të bëjë pagesën parciale deri me datën 15.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.CONTACTED, notes: 'Bisedë e gjatë. Debitori ka shpjeguar vështirësitë financiare. Kemi rënë dakord për plan pagesash me këste mujore.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.NO_ANSWER, notes: 'Nuk u përgjigj. Tentova dy herë me numrin kryesor dhe një herë me numrin alternativ.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.NO_ANSWER, notes: 'Numri i telefonit nuk arrin. Mundësi e ndryshimit të numrit ose telefon i fikur.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.NO_ANSWER, notes: 'Telefoni bie por nuk përgjigjet. Do tentoj sërish nesër pasdite.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.REFUSED, notes: 'Debitori ka refuzuar të flasë për borxhin. Ka thënë se do konsultojë me avokat. Rekomandohet eskalim.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.REFUSED, notes: 'Ka mbyllur telefonin pas dëgjimit të çështjes. Qëndrim armiqësor. Mund të nevojitet procedim ligjor.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.PROMISE_RECEIVED, notes: 'Debitori ka premtuar pagesë prej 800 EUR brenda 5 ditëve. Do ndiqet premtimi.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.PROMISE_RECEIVED, notes: 'Premtim i marrë — 1.500 EUR deri të enjten. Debitori ka treguar gatishmëri.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.PARTIAL_PAYMENT, notes: 'Debitori ka informuar se ka bërë pagesë parciale. Pritet konfirmimi bankar.' },
        { type: client_1.ActivityType.CALL, outcome: client_1.ActivityOutcome.FULL_PAYMENT, notes: 'Debitori konfirmon pagesën e plotë. Pritet verifikimi zyrtar nga banka.' },
        { type: client_1.ActivityType.SMS, outcome: client_1.ActivityOutcome.OTHER, notes: 'SMS i dërguar me detajet e borxhit dhe afatin e pagesës. Numri +383 44 xxx xxx.' },
        { type: client_1.ActivityType.SMS, outcome: client_1.ActivityOutcome.OTHER, notes: 'SMS paralajmërues i dërguar. Afati i fundit — 5 ditë.' },
        { type: client_1.ActivityType.EMAIL, outcome: client_1.ActivityOutcome.OTHER, notes: 'Email i dërguar me pasqyrën e plotë të borxhit dhe planin e propozuar të pagesave.' },
        { type: client_1.ActivityType.FIELD_VISIT, outcome: client_1.ActivityOutcome.CONTACTED, notes: 'Vizitë në banesë. Debitori prezent. Ka premtuar pagesën javën e ardhshme.' },
        { type: client_1.ActivityType.FIELD_VISIT, outcome: client_1.ActivityOutcome.NO_ANSWER, notes: 'Vizitë në terren. Askush nuk hapi derën. Fqinji konfirmoi se jeton atje. Lashë njoftim.' },
        { type: client_1.ActivityType.PROMISE_TO_PAY, outcome: client_1.ActivityOutcome.PROMISE_RECEIVED, notes: 'Premtim formal i pagës regjistruar — 1.200 EUR deri datën 30 të muajit.' },
        { type: client_1.ActivityType.PAYMENT_RECEIVED, outcome: client_1.ActivityOutcome.FULL_PAYMENT, notes: 'Pagesë e plotë e marrë. Fatura e lëshuar. Dosja mund të mbyllet.' },
        { type: client_1.ActivityType.PAYMENT_RECEIVED, outcome: client_1.ActivityOutcome.PARTIAL_PAYMENT, notes: 'Pagesë parciale e marrë. Debitori ka premtuar balancën brenda 30 ditëve.' },
        { type: client_1.ActivityType.NOTE, outcome: client_1.ActivityOutcome.OTHER, notes: 'Shënim i brendshëm: debitori ka problemet shëndetësore. Kërkon konsultë me menaxherin për shtyrje.' },
        { type: client_1.ActivityType.LEGAL_ACTION, outcome: client_1.ActivityOutcome.OTHER, notes: 'Procedim ligjor i iniciuar. Dokumentet i janë dërguar avokatit. Pritet vendimi i gjykatës.' },
        { type: client_1.ActivityType.NOTE, outcome: client_1.ActivityOutcome.DISPUTE, notes: 'Debitori konteston shumën e borxhit. Dokumentet i janë dërguar bankës për verifikim.' },
    ];
    for (let ci = 0; ci < allCases.length; ci++) {
        const { c, d } = allCases[ci];
        if (d.status === client_1.CaseStatus.WRITTEN_OFF)
            continue;
        const actCount = 2 + (ci % 6);
        for (let ai = 0; ai < actCount; ai++) {
            const t = activityTemplates[(ci * 3 + ai) % activityTemplates.length];
            const isPtp = t.outcome === client_1.ActivityOutcome.PROMISE_RECEIVED;
            await prisma.activity.create({
                data: {
                    caseId: c.id,
                    officerId: d.officer.id,
                    activityType: t.type,
                    outcome: t.outcome,
                    notes: t.notes,
                    occurredAt: daysAgo(2 + ai * 5 + ci % 10),
                    nextActionDate: ai < 2 && d.status === client_1.CaseStatus.ACTIVE ? daysFromNow(3 + ai * 4) : null,
                    promiseAmount: isPtp ? Math.max(100, Math.round(d.out * 0.25)) : null,
                },
            });
        }
    }
    const paymentRows = [
        { cIdx: 0, amt: 800, method: client_1.PaymentMethod.CASH, dAgo: 5, notes: 'Pagesë e konfirmuar.' },
        { cIdx: 1, amt: 500, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 3, notes: 'Transfertë bankare e marrë.' },
        { cIdx: 2, amt: 1200, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 7, notes: 'Pagesë e rregullt mujore.' },
        { cIdx: 3, amt: 2400, method: client_1.PaymentMethod.CARD, dAgo: 2, notes: 'Pagesë me kartë.' },
        { cIdx: 4, amt: 650, method: client_1.PaymentMethod.CASH, dAgo: 10, notes: 'Cash i marrë në zyrë.' },
        { cIdx: 5, amt: 3800, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 1, notes: 'Pagesë sipas marrëveshjes.' },
        { cIdx: 7, amt: 1800, method: client_1.PaymentMethod.MOBILE, dAgo: 4, notes: 'Pagesë online e konfirmuar.' },
        { cIdx: 9, amt: 4200, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 6, notes: 'Pagesë e plotë e premtuar.' },
        { cIdx: 10, amt: 700, method: client_1.PaymentMethod.CASH, dAgo: 12, notes: 'Cash në dorëzim.' },
        { cIdx: 11, amt: 5500, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 15, notes: 'Pagesë e madhe e marrë.' },
        { cIdx: 0, amt: 600, method: client_1.PaymentMethod.CASH, dAgo: 35, notes: 'Pagesë e hershme mujore.' },
        { cIdx: 3, amt: 1100, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 40, notes: 'Transfertë nga llogaria rrjedhëse.' },
        { cIdx: 5, amt: 2000, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 28, notes: 'Pagesë e dytë.' },
        { cIdx: 7, amt: 3300, method: client_1.PaymentMethod.MOBILE, dAgo: 22, notes: 'Portal online i bankës.' },
        { cIdx: 18, amt: 5500, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 45, notes: 'Pagesë finale — dosja u mbyll.' },
        { cIdx: 19, amt: 3800, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 60, notes: 'Borxhi i shlyer plotësisht.' },
        { cIdx: 20, amt: 2200, method: client_1.PaymentMethod.CASH, dAgo: 30, notes: 'Pagesë e fundit cash.' },
        { cIdx: 1, amt: 1500, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 65, notes: 'Pagesë nga muaji i kaluar.' },
        { cIdx: 2, amt: 900, method: client_1.PaymentMethod.CASH, dAgo: 72, notes: 'Cash — pagesë mujore.' },
        { cIdx: 4, amt: 2800, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 80, notes: 'Pagesë sipas planit.' },
        { cIdx: 6, amt: 1200, method: client_1.PaymentMethod.MOBILE, dAgo: 95, notes: 'Pagesë online.' },
        { cIdx: 8, amt: 3400, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 110, notes: 'Transfertë nga llogaria.' },
        { cIdx: 9, amt: 780, method: client_1.PaymentMethod.CHECK, dAgo: 120, notes: 'Çek i pranuar dhe i verifikuar.' },
        { cIdx: 10, amt: 4500, method: client_1.PaymentMethod.BANK_TRANSFER, dAgo: 130, notes: 'Pagesë e madhe mujore.' },
    ];
    let payIdx = 1;
    for (const p of paymentRows) {
        if (!allCases[p.cIdx])
            continue;
        const { c, d } = allCases[p.cIdx];
        try {
            await prisma.payment.create({
                data: {
                    caseId: c.id,
                    officerId: d.officer.id,
                    paymentReference: `PAY-2026-${String(payIdx++).padStart(4, '0')}`,
                    amount: p.amt,
                    paymentDate: daysAgo(p.dAgo),
                    paymentMethod: p.method,
                    notes: p.notes,
                },
            });
        }
        catch { }
    }
    const agreementDefs = [
        { cIdx: 0, total: 3800, count: 6, startDaysAgo: 10, status: client_1.AgreementStatus.ACTIVE, notes: 'Debitori është duke respektuar kushtet. Pagesa mujore bëhet rregullisht.' },
        { cIdx: 1, total: 2650, count: 4, startDaysAgo: 5, status: client_1.AgreementStatus.ACTIVE, notes: 'Plan 4-mujor i rënë dakord. Debitori ka paguar këstët 1 dhe 2 në kohë.' },
        { cIdx: 3, total: 7400, count: 12, startDaysAgo: 20, status: client_1.AgreementStatus.ACTIVE, notes: 'Plan i gjatë 12-mujor. Debitori ka vështirësi por paguan.' },
        { cIdx: 4, total: 4200, count: 8, startDaysAgo: 15, status: client_1.AgreementStatus.ACTIVE, notes: 'Pagesa mujore 525 EUR. Debitori i qëndrueshëm.' },
        { cIdx: 5, total: 3100, count: 6, startDaysAgo: 30, status: client_1.AgreementStatus.ACTIVE, notes: 'Plan 6-mujor. Ecuri pozitive deri tani.' },
        { cIdx: 7, total: 6900, count: 10, startDaysAgo: 45, status: client_1.AgreementStatus.ACTIVE, notes: 'Plan afatgjatë. Pagesa e parë e marrë, pritet e dyta.' },
        { cIdx: 2, total: 5900, count: 8, startDaysAgo: 120, status: client_1.AgreementStatus.COMPLETED, notes: 'Marrëveshja u realizua plotësisht. Të gjitha këstët e paguara. Dosja mbyllur.' },
        { cIdx: 8, total: 4100, count: 6, startDaysAgo: 150, status: client_1.AgreementStatus.COMPLETED, notes: 'Marrëveshja e përfunduar. Debitori i ka shlyer të gjitha detyrimet.' },
        { cIdx: 6, total: 10800, count: 12, startDaysAgo: 60, status: client_1.AgreementStatus.BROKEN, notes: 'Debitori ka ndërprerë pagesat pas këstit të tretë. Kërkohet veprim ligjor ose ri-negocim.' },
        { cIdx: 9, total: 6500, count: 8, startDaysAgo: 90, status: client_1.AgreementStatus.CANCELLED, notes: 'Marrëveshja u anulua me kërkesë të debitorit. Procedura standarde e anulimit.' },
    ];
    let agrIdx = 1;
    for (const a of agreementDefs) {
        if (!allCases[a.cIdx])
            continue;
        const { c, d } = allCases[a.cIdx];
        const startDate = daysAgo(a.startDaysAgo);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + a.count);
        const ref = `AGR-2026-${String(agrIdx++).padStart(3, '0')}`;
        try {
            await prisma.agreement.create({
                data: {
                    agreementReference: ref,
                    caseId: c.id,
                    totalAmount: a.total,
                    installmentCount: a.count,
                    startDate,
                    endDate,
                    status: a.status,
                    notes: a.notes,
                },
            });
        }
        catch { }
    }
    const legalCases = allCases.filter(({ d }) => d.status === client_1.CaseStatus.LEGAL);
    const legalStatuses = ['INITIATED', 'IN_PROGRESS', 'JUDGMENT', 'ENFORCEMENT'];
    const courts = ['Gjykata Themelore — Prishtinë', 'Gjykata Themelore — Prizren', 'Gjykata Themelore — Pejë', 'Gjykata Themelore — Ferizaj'];
    const legalNotes = [
        'Padia e dorëzuar. Numri i lëndës marrë nga gjykata. Pritet seanca e parë dëgjimore.',
        'Seanca e dytë u zhvillua. Debitori ka paraqitur kundërpadi. Gjyqtari ka caktuar ekspert financiar.',
        'Vendimi gjyqësor i marrë në favor të kreditorit. Shuma e plotë plus kamatë njihet ligjërisht.',
        'Procesbajtësi ka bllokuar llogaritë bankare. Pritet transferimi i fondeve.',
    ];
    for (let li = 0; li < legalCases.length; li++) {
        const { c, caseRef } = legalCases[li];
        const st = legalStatuses[li % legalStatuses.length];
        try {
            await prisma.legalProceeding.create({
                data: {
                    caseId: c.id,
                    proceedingRef: `LEG-${caseRef}`,
                    status: st,
                    court: courts[li % courts.length],
                    filingDate: daysAgo(60 + li * 20),
                    nextHearingDate: ['INITIATED', 'IN_PROGRESS'].includes(st) ? daysFromNow(10 + li * 7) : null,
                    judgmentDate: st === 'JUDGMENT' || st === 'ENFORCEMENT' ? daysAgo(10 + li * 5) : null,
                    notes: legalNotes[li % legalNotes.length],
                },
            });
        }
        catch { }
    }
    const taskDefs = [
        { cIdx: 0, officer: rgashi, title: 'Kontaktoni debitorin për premtimin e vonuar', priority: 'HIGH', dueDays: 1, done: false },
        { cIdx: 1, officer: lkelmendi, title: 'Dërgoni email me pasqyrën e borxhit', priority: 'MEDIUM', dueDays: 2, done: false },
        { cIdx: 2, officer: vberisha, title: 'Planifikoni vizitë në terren — adresa e re', priority: 'HIGH', dueDays: 0, done: false },
        { cIdx: 3, officer: smorina, title: 'Gjurmoni këstin e parë të marrëveshjes', priority: 'HIGH', dueDays: 3, done: false },
        { cIdx: 4, officer: ehalili, title: 'Siguroni dokumentacionin familjar', priority: 'MEDIUM', dueDays: 5, done: false },
        { cIdx: 5, officer: nrugova, title: 'Dërgoni njoftim formal para procedimit ligjor', priority: 'URGENT', dueDays: 1, done: false },
        { cIdx: 6, officer: ahoxha, title: 'Koordinoni me avokatin për seancën', priority: 'URGENT', dueDays: 0, done: false },
        { cIdx: 7, officer: dbajrami, title: 'Verifikoni adresën e re të debitorit', priority: 'MEDIUM', dueDays: 4, done: false },
        { cIdx: 8, officer: vberisha, title: 'Konfirmoni pagesën e rregullt mujore', priority: 'LOW', dueDays: 7, done: false },
        { cIdx: 9, officer: rgashi, title: 'Lëshoni vërtetim pagese për bankë', priority: 'MEDIUM', dueDays: 2, done: false },
        { cIdx: 10, officer: smorina, title: 'Thirrje verifikuese pas premtimit 2-javor', priority: 'HIGH', dueDays: -1, done: false },
        { cIdx: 11, officer: nrugova, title: 'Shqyrtoni dokumentacionin mjekësor', priority: 'MEDIUM', dueDays: 6, done: false },
        { cIdx: 13, officer: dbajrami, title: 'Përgatitni dosjen për komisionin e borxhit', priority: 'HIGH', dueDays: 3, done: false },
        { cIdx: 14, officer: nrugova, title: 'Takimi me avokatin — strategjia ligjore', priority: 'URGENT', dueDays: 2, done: false },
        { cIdx: 0, officer: rgashi, title: 'Verifikim i pagesës bankare', priority: 'MEDIUM', dueDays: -5, done: true },
        { cIdx: 1, officer: lkelmendi, title: 'Printim i dokumentacionit të marrëveshjes', priority: 'LOW', dueDays: -10, done: true },
        { cIdx: 3, officer: smorina, title: 'SMS i dërguar me datën e këstit', priority: 'LOW', dueDays: -3, done: true },
        { cIdx: 5, officer: nrugova, title: 'Lëshim i njoftimit zyrtar me postë', priority: 'MEDIUM', dueDays: -7, done: true },
    ];
    for (const t of taskDefs) {
        if (!allCases[t.cIdx])
            continue;
        const { c } = allCases[t.cIdx];
        try {
            await prisma.task.create({
                data: {
                    caseId: c.id,
                    assignedToId: t.officer.id,
                    title: t.title,
                    priority: t.priority,
                    dueDate: daysFromNow(t.dueDays),
                    completedAt: t.done ? daysAgo(Math.abs(t.dueDays)) : null,
                },
            });
        }
        catch { }
    }
    console.log('✅ Të dhënat fillestare u ngarkuan me sukses!');
    console.log('');
    console.log('   Hyrja: admin / admin123');
    console.log('   Hyrja: b.vitia / admin123  (Menaxher — Prishtinë)');
    console.log('   Hyrja: r.gashi / admin123  (Oficer — Prishtinë)');
    console.log('   Hyrja: viewer / admin123   (Vizues)');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map