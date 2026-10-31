"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { useAuth } from "@/lib/auth";
import { cases as casesApi, payments as paymentsApi, agreements as agreementsApi, activities as activitiesApi, legal as legalApi, reports as reportsApi, fetchAllPages } from "@/lib/api";
import { formatEnum } from "@/lib/utils";
import { BarChart3, Play, X, RefreshCw, CheckCircle2, FileText, CreditCard, Scale, Activity, FileCheck, FileSpreadsheet, AlertCircle, Handshake } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { presetToRange, REPORT_PRESETS } from "@/components/ui/DatePresetPicker";
import { AccessGuard } from "@/components/AccessGuard";

const REPORTS = [
  {
    code: "PORTFOLIO_SUMMARY",
    name: "Klientët e Mi",
    desc: "Klientët aktualë të portofolit personal me balancën, statusin dhe kategorinë",
    icon: BarChart3,
    columns: ["NID", "Emri Mbiemri", "Lindja", "Tel 1", "Tel 2", "Email", "Adresa", "Qyteti", "Nr. Kredisë", "Institucioni", "Zyrtari 1", "Zyrtari 2", "Shuma Origjinale", "Borxhi Aktual", "DPD", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Klient", "Statusi", "Faza", "Kategoria", "Data Pagesës së Fundit"],
    info: "Eksporton klientët e portofolit personal me format të plotë — zyrtarët, kategoria, qyteti, data e pagesës së fundit. Oficeri shikon vetëm klientët e tij/saj; admini shikon të gjitha.",
  },
  {
    code: "MY_PAYMENTS",
    name: "Raporti me Pagesa të Realizuara",
    desc: "Pagesat e arkëtuara nga portofoli personal, të ndara sipas periudhës",
    icon: CreditCard,
    columns: ["Ref. Pagesë", "Data", "Shuma", "Metoda", "Kanali", "Zyrtari Arkëtues", "NID", "Emri", "Tel 1", "Tel 2", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Klient", "Statusi", "Faza", "Kategoria"],
    info: "Eksporton pagesat e realizuara nga portofoli personal me format të plotë. Oficeri shikon vetëm pagesat e tij/saj; admini shikon të gjitha.",
  },
  {
    code: "AGREEMENT_STATUS",
    name: "Statusi i Marrëveshjeve",
    desc: "Të gjitha marrëveshjet aktive me ecurinë e kësteve",
    icon: FileCheck,
    columns: ["Ref. Marrëveshje", "Statusi", "Totali", "Këste", "Paguar", "Vonuar", "Data e Ardhshme", "NID", "Emri", "Tel 1", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Klient", "Faza"],
    info: "Eksporton marrëveshjet me format të plotë — detajet e marrëveshjes dhe kësteve plus të gjitha fushat e borrowerit nga formati i migrimit. Oficeri shikon vetëm klientët e tij/saj.",
  },
  {
    code: "OVERDUE_INSTALLMENTS",
    name: "Këste me Vonesë",
    desc: "Këste që kanë kaluar datën e maturimit",
    icon: FileText,
    columns: ["Ref. Marrëveshje", "Kësti #", "Data Maturimit", "Shuma", "Ditë Vonesë", "NID", "Emri", "Tel 1", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Klient", "Faza"],
    info: "Eksporton vetëm këste me status VONUAR, të renditura nga vonesa më e madhe. Çdo këst i vonuar del si rresht i veçantë me të gjitha të dhënat e borrowerit nga formati i migrimit.",
  },
  {
    code: "LEGAL_CASES",
    name: "Klientët Gjyqësore",
    desc: "Procedurat gjyqësore aktive me datat e seancave të ardhshme",
    icon: Scale,
    columns: ["Ref. Procedurës", "Statusi", "Gjykata", "Nr. Gjyqësor", "Dorëzuar", "Iniciuar", "Seanca e Ardhshme", "Vendim", "Shuma Vendimit", "NID", "Emri", "Tel 1", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Klient", "Faza"],
    info: "Eksporton të gjitha procedurat gjyqësore — detajet ligjore (gjykata, datat, vendimi) plus formatin e plotë të migrimit për çdo klient. Oficeri shikon vetëm klientët e tij/saj.",
  },
  {
    code: "ACTIVITY_LOG",
    name: "Raporti me Aktivitete",
    desc: "Të gjitha aktivitetet e regjistruara në periudhën e zgjedhur me të dhëna të plota",
    icon: Activity,
    columns: ["Data", "Lloji", "Kanali", "Rezultati", "Data Premtimit", "Shuma Premtimit", "Oficeri", "Zyrtari 2", "NID", "Emri", "Tel 1", "Tel 2 (I siguruar)", "Adresa", "Qyteti", "Nr. Kredisë", "Banka/Institucioni", "Borxhi Aktual", "Garant 1", "Garant 2", "Ko-huamarrësi", "Ref. Klient", "Statusi", "Faza", "Kategoria"],
    info: "Eksporton të gjitha aktivitetet me format të plotë — detajet e aktivitetit, data e premtimit, telefoni i siguruar, adresa, kategoria plus të gjitha fushat e borrowerit. Oficeri shikon vetëm aktivitetet e tij/saj.",
  },
  {
    code: "OVERDUE_CLIENTS",
    name: "Klientët në Vonesë",
    desc: "Klientët me premtime ose këste të vonuara, me të dhëna të plota kontakti",
    icon: AlertCircle,
    columns: ["NID", "Emri Mbiemri", "Tel 1", "Tel 2", "Adresa", "Qyteti", "Nr. Kredisë", "Institucioni", "Borxhi Aktual", "Zyrtari 1", "Zyrtari 2", "Data Premtimit", "Shuma Premtuar", "Garant 1 Emri", "Garant 1 Tel", "Garant 2 Emri", "Garant 2 Tel", "Ref. Klient", "Statusi", "Faza", "Kategoria"],
    info: "Eksporton klientët me premtime të vonuara ose këste të papaguara — me detaje të plota kontakti, garantorët dhe informacionin e kredisë. Oficeri shikon vetëm klientët e tij/saj.",
  },
  {
    code: "PROMISES",
    name: "Raporti i Premtimeve",
    desc: "Të gjitha premtimet e pagesës me statusin, shumën dhe të dhënat e klientit",
    icon: Handshake,
    columns: ["Data Premtimit", "Shuma Premtuar", "Valuta", "Statusi", "Shuma Realizuar", "Data Realizimit", "Shënime", "Krijuar nga", "Data Krijimit", "NID", "Emri Mbiemri", "Tel 1", "Tel 2", "Adresa", "Qyteti", "Nr. Kredisë", "Institucioni", "Zyrtari 1", "Zyrtari 2", "Shuma Origjinale", "Borxhi Aktual", "Data Pagesës së Fundit", "Faza", "Kodi Zyrës", "Garant 1 NID", "Garant 1 Emri", "Garant 1 Tel", "Garant 2 NID", "Garant 2 Emri", "Garant 2 Tel", "Ko-huamarrësi NID", "Ko-huamarrësi Emri", "Ko-huamarrësi Tel", "Ref. Klient", "Statusi Rastit"],
    info: "Eksporton të gjitha premtimet e pagesës me detajet e premtimit (data, shuma, statusi, realizimi) dhe të dhënat e plota të klientit dhe kredisë. Oficeri shikon vetëm premtimet e klientëve të tij/saj; manageri shikon zyrën e tij/saj; admini shikon të gjitha.",
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
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const blob = await reportsApi.downloadCaseStatusXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gjendja-klientëve-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
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
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
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
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const blob = await reportsApi.downloadLegalCasesXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `klientët-gjyqesore-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "ACTIVITY_LOG") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const blob = await reportsApi.downloadActivityLogXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `aktivitetet-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "MY_PAYMENTS") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const blob = await reportsApi.downloadCollectionsXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pagesat-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "OVERDUE_CLIENTS") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        const blob = await reportsApi.downloadOverdueClientsXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `klientet-vonese-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      } else if (report.code === "PROMISES") {
        const params: any = {};
        if (user?.role === "OFFICER") params.officerId = user.id;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const blob = await reportsApi.downloadPromisesXlsx(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `premtimet-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      }

      setResult({ rows: rows.length - 1, preview: rows.slice(0, 6), all: rows });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const hasDateRange = true;
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
          <button onClick={onClose} className="modal-close-btn"><X size={16} /></button>
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
              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {REPORT_PRESETS.map((p) => {
                  const r = presetToRange(p.key);
                  const active = dateFrom === r.from && dateTo === r.to;
                  return (
                    <button key={p.key} type="button"
                      onClick={() => { setDateFrom(r.from); setDateTo(r.to); setResult(null); }}
                      className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors ${
                        active
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
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
        { title: "Si të gjeneroj një raport hap pas hapi", body: "1) Klikoni mbi llojin e raportit që dëshironi. 2) Vendosni datën e fillimit dhe mbarimit — periudha ndikon drejtpërdrejt cilat rekorde përfshihen. 3) Klikoni 'Ekzekuto Raportin'. Sistemi ngarkon të dhënat dhe shfaq një pamje paraprake. 4) Klikoni 'Eksporto në Excel' për të shkarkuar skedarin." },
        { title: "Cilin raport të përdor?", body: "Raporti i Arkëtimeve — për pagesat e marra: i dobishëm për llogaridhënien mujore dhe financiarin. Regjistri i Aktiviteteve — çdo kontakt i bërë: për rishikimin e punës së ekipit. Raporti i Klientëve — lista e plotë e portofolit me statusin aktual: për analizë portofoli. Raporti i Marrëveshjeve — planet e ripagimit aktive dhe thyera." },
        { title: "Raporti im është bosh ose ka pak të dhëna", body: "Kontrolloni nëse datat janë vendosur saktë — raporti tregon vetëm rekorde brenda intervalit të zgjedhur. Nëse megjithatë pritet të ketë të dhëna dhe nuk shfaqen, sigurohuni që aktivitetet ose pagesat janë regjistruar gjatë asaj periudhe." },
        { title: "Si të ndaj raportin me ekipin?", body: "Pas eksportit, skedari Excel ruhet automatikisht te 'Shkarkimet' e kompjuterit tuaj. Mund ta dërgoni me email, ta ngarkoni te SharePoint ose ta printoni. Skedari Excel mund të editorohet dhe formatohet sipas nevojës tuaj pa prekur të dhënat e sistemit." },
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
