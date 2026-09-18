"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { useAuth } from "@/lib/auth";
import { cases as casesApi, payments as paymentsApi, agreements as agreementsApi, activities as activitiesApi, legal as legalApi, reports as reportsApi, fetchAllPages } from "@/lib/api";
import { formatEnum } from "@/lib/utils";
import { BarChart3, Play, X, RefreshCw, CheckCircle2, FileText, CreditCard, Scale, Activity, FileCheck, FileSpreadsheet, AlertCircle } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { AccessGuard } from "@/components/AccessGuard";

const REPORTS = [
  {
    code: "PORTFOLIO_SUMMARY",
    name: "Gjendja e Dosjeve",
    desc: "Të gjitha dosjet aktuale me balancën, statusin dhe fazën e arkëtimit",
    icon: BarChart3,
    columns: ["NID", "Emri Mbiemri", "Lindja", "Tel 1", "Tel 2", "Email", "Adresa", "Qyteti", "Nr. Kredisë", "Institucioni", "Zyrtari 1 (ID)", "Zyrtari 2 (ID)", "Shuma Origjinale", "Borxhi Aktual", "DPD", "Klasifikimi NPL", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Dosje", "Statusi", "Faza"],
    info: "Eksporton dosjet me format identik me importin — të gjitha fushat e borrowerit, kredisë, garantorëve dhe ko-huamarrësit. Oficeri shikon vetëm dosjet e tij/saj; admini shikon të gjitha.",
  },
  {
    code: "COLLECTIONS",
    name: "Raporti i Arkëtimeve",
    desc: "Pagesat e arkëtuara, të ndara sipas periudhës dhe metodës",
    icon: CreditCard,
    columns: ["Ref. Pagesë", "Data", "Shuma", "Metoda", "Kanali", "Zyrtari Arkëtues", "NID", "Emri", "Tel 1", "Tel 2", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Dosje", "Statusi", "Faza"],
    info: "Eksporton pagesat me format të plotë — të dhënat e pagesës plus të gjitha fushat e borrowerit, garantorëve dhe ko-huamarrësit nga formati i migrimit. Oficeri shikon vetëm pagesat e tij/saj.",
  },
  {
    code: "AGREEMENT_STATUS",
    name: "Statusi i Marrëveshjeve",
    desc: "Të gjitha marrëveshjet aktive me ecurinë e kësteve",
    icon: FileCheck,
    columns: ["Ref. Marrëveshje", "Statusi", "Totali", "Këste", "Paguar", "Vonuar", "Data e Ardhshme", "NID", "Emri", "Tel 1", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Dosje", "Faza"],
    info: "Eksporton marrëveshjet me format të plotë — detajet e marrëveshjes dhe kësteve plus të gjitha fushat e borrowerit nga formati i migrimit. Oficeri shikon vetëm dosjet e tij/saj.",
  },
  {
    code: "OVERDUE_INSTALLMENTS",
    name: "Këste me Vonesë",
    desc: "Këste që kanë kaluar datën e maturimit",
    icon: FileText,
    columns: ["Ref. Marrëveshje", "Kësti #", "Data Maturimit", "Shuma", "Ditë Vonesë", "NID", "Emri", "Tel 1", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Dosje", "Faza"],
    info: "Eksporton vetëm këste me status VONUAR, të renditura nga vonesa më e madhe. Çdo këst i vonuar del si rresht i veçantë me të gjitha të dhënat e borrowerit nga formati i migrimit.",
  },
  {
    code: "LEGAL_CASES",
    name: "Dosjet Gjyqësore",
    desc: "Procedurat gjyqësore aktive me datat e seancave të ardhshme",
    icon: Scale,
    columns: ["Ref. Procedurës", "Statusi", "Gjykata", "Nr. Gjyqësor", "Dorëzuar", "Iniciuar", "Seanca e Ardhshme", "Vendim", "Shuma Vendimit", "NID", "Emri", "Tel 1", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Dosje", "Faza"],
    info: "Eksporton të gjitha procedurat gjyqësore — detajet ligjore (gjykata, datat, vendimi) plus formatin e plotë të migrimit për çdo rast. Oficeri shikon vetëm dosjet e tij/saj.",
  },
  {
    code: "ACTIVITY_LOG",
    name: "Regjistri i Aktiviteteve",
    desc: "Të gjitha aktivitetet e regjistruara në periudhën e zgjedhur",
    icon: Activity,
    columns: ["Lloji", "Ref. Dosje", "Debitor", "Oficer", "Datë", "Rezultat", "Shënime"],
    info: "Eksporton historikun e plotë të aktiviteteve. Përdorni intervalin kohor për të filtruar në një periudhë specifike.",
  },
];

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  // Explicit UTF-8 BOM bytes (EF BB BF) — the only reliable way to make Excel open
  // special characters (ë, ç, etc.) correctly on both Windows and Mac.
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const body = new TextEncoder().encode(csv);
  const blob = new Blob([bom, body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function RunModal({ report, onClose }: { report: typeof REPORTS[0]; onClose: () => void }) {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ rows: number; preview: string[][]; all: string[][] } | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true); setError(""); setResult(null);
    try {
      // PORTFOLIO_SUMMARY: server generates full XLSX in migration format, download directly
      if (report.code === "PORTFOLIO_SUMMARY") {
        const params: { officerId?: string } = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        const blob = await reportsApi.downloadCaseStatusXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gjendja-dosjeve-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      }

      let rows: string[][] = [];

      if (report.code === "COLLECTIONS") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const blob = await reportsApi.downloadCollectionsXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `arketimet-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "AGREEMENT_STATUS") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        const blob = await reportsApi.downloadAgreementStatusXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marreveshjet-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "OVERDUE_INSTALLMENTS") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        const blob = await reportsApi.downloadOverdueInstallmentsXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `keste-vonese-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "LEGAL_CASES") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        const blob = await reportsApi.downloadLegalCasesXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dosjet-gjyqesore-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "ACTIVITY_LOG") {
        const extra: any = {};
        if (dateFrom) extra.from = dateFrom;
        if (dateTo) extra.to = dateTo;
        const data = await fetchAllPages((p) => activitiesApi.listAll(p), extra);
        rows = [["Lloji", "Ref. Dosje", "Debitor", "Oficer", "Datë", "Rezultat", "Shënime"]];
        for (const a of data) {
          rows.push([
            formatEnum(a.activityType),
            a.case?.caseReference ?? "",
            `${a.case?.loan?.borrower?.fullName}`.trim(),
            a.officer?.fullName ?? "",
            a.occurredAt ? new Date(a.occurredAt).toLocaleDateString("sq-AL") : "",
            a.outcome ? formatEnum(a.outcome) : "",
            a.notes ?? "",
          ]);
        }
      }

      setResult({ rows: rows.length - 1, preview: rows.slice(0, 6), all: rows });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const hasDateRange = ["COLLECTIONS", "ACTIVITY_LOG"].includes(report.code);
  const Icon = report.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh] modal-panel">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Icon size={15} className="text-gray-500" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">{report.name}</h2>
              <p className="text-[12px] text-gray-400">{report.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Report info */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[12px] text-gray-500 leading-relaxed mb-3">{report.info}</p>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Kolonat e eksportuara</div>
            <div className="flex flex-wrap gap-1.5">
              {report.columns.map((col) => (
                <span key={col} className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[11px] text-gray-600 font-mono">{col}</span>
              ))}
            </div>
          </div>

          {/* Date range — only for reports that support it */}
          {hasDateRange && (
            <div>
              <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Filtro sipas periudhës (opsionale)</div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">Nga</label>
                  <DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setResult(null); }} placeholder="Data e fillimit" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">Deri</label>
                  <DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setResult(null); }} placeholder="Data e mbarimit" />
                </div>
              </div>
            </div>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}

          {result && result.rows === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertCircle size={18} className="text-amber-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-700">Nuk u gjetën të dhëna</div>
                <div className="text-[12px] text-gray-400 mt-0.5">Provoni të ndryshoni periudhën kohore ose verifikoni që ekzistojnë të dhëna për këtë raport.</div>
              </div>
            </div>
          )}

          {result && result.rows > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] text-gray-600">
                <CheckCircle2 size={14} className="text-gray-400" />
                {result.rows} rreshta gati për eksport
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50">
                    <tr>
                      {result.preview[0]?.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.preview.slice(1).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-left text-gray-600 whitespace-nowrap">{cell || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows > 5 && (
                  <div className="px-3 py-2 bg-gray-50 text-[11px] text-gray-400 border-t border-gray-100">
                    Po shfaqen 5 nga {result.rows} rreshta — eksporto për të parë të gjitha
                    {result.rows >= 200 && " · i kufizuar në 200 rreshta"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Mbyll</button>
          <button onClick={run} disabled={running}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            {running ? "Duke ekzekutuar…" : "Ekzekuto Raportin"}
          </button>
          {result && result.rows > 0 && (
            <button
              onClick={() => downloadCSV(`${report.code.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`, result.all)}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 transition-colors">
              <FileSpreadsheet size={13} /> Eksporto në Excel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsPageInner() {
  const [activeReport, setActiveReport] = useState<typeof REPORTS[0] | null>(null);

  return (
    <div className="flex flex-col">
      <Topbar title="Raporte" subtitle="Gjenero dhe shkarko raporte operacionale si CSV" help={[
        { title: "Si të gjeneroj një raport", body: "Zgjidhni llojin e raportit nga lista, zgjidhni datën e fillimit dhe mbarimit, pastaj klikoni 'Ekzekuto Raportin'. Një pamje paraprake e të dhënave do të shfaqet në ekran për t'i kontrolluar para shkarkimit." },
        { title: "Shkarkimi në Excel", body: "Pas ekzekutimit të raportit, klikoni 'Eksporto në Excel' për të shkarkuar skedarin. Ai hapet drejtpërdrejt në Microsoft Excel ose çdo aplikacion tabelar." },
        { title: "Cilin raport duhet të përdor?", body: "Raporti i Arkëtimeve tregon të gjitha pagesat e arkëtuara në periudhë — përdoreni për përmbledhjet mujore. Regjistri i Aktiviteteve tregon çdo telefonatë, vizitë dhe tentativë kontakti — përdoreni për të rishikuar aktivitetin e oficerëve." },
        { title: "Të dhënat duken të gabuara", body: "Sigurohuni që intervali kohor është i saktë — raporti përfshin vetëm rekordet brenda datave të zgjedhura. Nëse shikoni ende të dhëna të papritura, kontaktoni administratorin tuaj." },
      ]} />

      {activeReport && <RunModal report={activeReport} onClose={() => setActiveReport(null)} />}

      <div className="p-4 md:p-6 space-y-5">
        <div>
          <h2 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Raportet e Disponueshme</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.code}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-brand-300 hover:shadow-sm transition-all group cursor-pointer"
                  onClick={() => setActiveReport(r)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon size={14} className="text-gray-500" />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={10} /> Ekzekuto
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mb-0.5">{r.name}</div>
                  <div className="text-[12px] text-gray-400 leading-snug">{r.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AccessGuard permission="page:reports">
      <ReportsPageInner />
    </AccessGuard>
  );
}
