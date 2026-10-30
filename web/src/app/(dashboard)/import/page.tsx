"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { importApi } from "@/lib/api";
import {
  Upload, Download, CheckCircle, XCircle, AlertTriangle,
  FileSpreadsheet, Clock, RotateCcw, ChevronDown, ChevronUp,
  Copy, Check, X, RefreshCw, Info, ChevronRight, History,
  Pencil, ArrowRightLeft, Activity, CreditCard, Users,
} from "lucide-react";
import { downloadExcel } from "@/lib/exportExcel";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("sq-AL"); }
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString("sq-AL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const IMPORT_TYPE_LABELS: Record<string, string> = {
  PORTFOLIO:   "Import Klientësh",
  ACTIVITIES:  "Import Aktivitetesh",
  PAYMENTS:    "Import Pagesash",
  BALANCES:    "Import Bilancesh",
  BULK_UPDATE: "Ndryshime të Pjesshme",
};

const IMPORT_TYPE_COLORS: Record<string, string> = {
  PORTFOLIO:   "bg-brand-50 text-brand-700 border-brand-200",
  ACTIVITIES:  "bg-blue-50 text-blue-700 border-blue-200",
  PAYMENTS:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  BALANCES:    "bg-amber-50 text-amber-700 border-amber-200",
  BULK_UPDATE: "bg-purple-50 text-purple-700 border-purple-200",
};

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy} title="Kopjo"
      className="ml-1 p-0.5 rounded text-gray-300 hover:text-brand-500 transition-colors shrink-0">
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  );
}

// ── Upload zone ────────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = useCallback((f: File | null | undefined) => { if (f) onFile(f); }, [onFile]);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-10 cursor-pointer transition-all select-none flex-1
        ${drag ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50"}`}
    >
      <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
        onChange={(e) => handle(e.target.files?.[0])} />
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${drag ? "bg-brand-100" : "bg-white border border-gray-200"}`}>
        <Upload size={18} className={drag ? "text-brand-600" : "text-gray-400"} />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-semibold text-gray-700">Tërhiq skedarin këtu ose kliko për ta zgjedhur</p>
        <p className="text-[12px] text-gray-400 mt-0.5">Excel ose CSV · maks. 50 MB</p>
      </div>
    </div>
  );
}

// ── Result panel ───────────────────────────────────────────────────────────────

function ResultPanel({ result, onReset, successLabel = "klient" }: { result: any; onReset: () => void; successLabel?: string }) {
  const [showErrors, setShowErrors] = useState(false);
  const hasErrors = result.errors?.length > 0;
  const allFailed = result.succeeded === 0 && result.failed > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Gjithsej",    val: result.total,     color: "text-gray-900",    bg: "bg-white" },
          { label: "Importuar",   val: result.succeeded, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Anashkaluar", val: result.skipped,   color: "text-amber-700",   bg: "bg-amber-50" },
          { label: "Gabime",      val: result.failed,    color: "text-red-700",     bg: "bg-red-50" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-200 px-4 py-3`}
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</div>
            <div className={`text-[24px] font-bold tabular ${color}`}>{fmt(val ?? 0)}</div>
          </div>
        ))}
      </div>

      {allFailed ? (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-red-800">Importi dështoi</p>
            <p className="text-[12px] text-red-600 mt-0.5">Të gjitha rreshtat kishin gabime. Kontrolloni se po përdorni modelin e saktë.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-800">
              {fmt(result.succeeded)} {successLabel}{result.succeeded !== 1 ? "ë" : ""} u shtuan me sukses
            </p>
            {(result.skipped ?? 0) > 0 && (
              <p className="text-[12px] text-emerald-600 mt-0.5">{fmt(result.skipped)} anashkaluar — ekzistonin tashmë.</p>
            )}
          </div>
        </div>
      )}

      {hasErrors && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <button onClick={() => setShowErrors(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors text-left">
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-red-500" />
              <span className="text-[13px] font-semibold text-red-800">{fmt(result.errors.length)} rresht me gabime</span>
            </div>
            {showErrors ? <ChevronUp size={14} className="text-red-400" /> : <ChevronDown size={14} className="text-red-400" />}
          </button>
          {showErrors && (
            <div className="divide-y divide-red-100 max-h-72 overflow-y-auto">
              {result.errors.map((e: any, i: number) => (
                <div key={i} className="px-4 py-2.5 bg-white">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Rreshti {e.row ?? e.rowNumber}</span>
                    {(e.ref || e.loan_number) && !String(e.ref ?? e.loan_number).startsWith("row-") && (
                      <span className="text-[11px] text-gray-400 font-mono">{e.ref ?? e.loan_number}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-700">{e.error ?? e.errorMessage}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={onReset}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors">
        <RotateCcw size={13} /> Import tjetër
      </button>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, allSkipped }: { status: string; allSkipped?: boolean }) {
  if (allSkipped && status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Anashkaluar
      </span>
    );
  }
  const map: Record<string, { label: string; color: string; dot: string }> = {
    COMPLETED:  { label: "Përfunduar",     color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    FAILED:     { label: "Dështuar",       color: "bg-red-50 text-red-600",         dot: "bg-red-400" },
    PROCESSING: { label: "Duke procesuar", color: "bg-amber-50 text-amber-700",     dot: "bg-amber-500 animate-pulse" },
    PENDING:    { label: "Në pritje",      color: "bg-gray-100 text-gray-600",      dot: "bg-gray-400" },
  };
  const m = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.label}
    </span>
  );
}

// ── Type badge ─────────────────────────────────────────────────────────────────

function TypeBadge({ importType }: { importType: string }) {
  const label = IMPORT_TYPE_LABELS[importType] ?? importType;
  const color = IMPORT_TYPE_COLORS[importType] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color}`}>
      {label}
    </span>
  );
}

// ── Rollback modal ─────────────────────────────────────────────────────────────

type RollbackState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "blocked"; reason: string; blockers: string[] }
  | { phase: "confirm"; caseCount: number; cases: string[] }
  | { phase: "deleting" }
  | { phase: "done"; deleted: number }
  | { phase: "error"; message: string };

function RollbackModal({ job, onClose, onSuccess }: { job: any; onClose: () => void; onSuccess: () => void }) {
  const [state, setState] = useState<RollbackState>({ phase: "checking" });

  useEffect(() => {
    importApi.rollbackCheck(job.id)
      .then((r) => {
        if (r.canRollback) {
          setState({ phase: "confirm", caseCount: r.caseCount ?? 0, cases: r.cases ?? [] });
        } else {
          setState({ phase: "blocked", reason: r.reason ?? "Rollback i bllokuar", blockers: r.blockers ?? [] });
        }
      })
      .catch((e: any) => setState({ phase: "error", message: e.message ?? "Gabim gjatë kontrollit" }));
  }, [job.id]);

  async function confirm() {
    setState({ phase: "deleting" });
    try {
      const r = await importApi.rollback(job.id);
      setState({ phase: "done", deleted: r.deleted });
      setTimeout(() => { onSuccess(); onClose(); }, 1800);
    } catch (e: any) {
      setState({ phase: "error", message: e.message ?? "Gabim gjatë anulimit" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <RotateCcw size={15} className="text-red-500" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-gray-900">Anulo Importin</div>
              <div className="text-[11px] text-gray-400 truncate">{job.fileName}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5">
          {state.phase === "checking" && (
            <div className="flex items-center gap-3 py-4">
              <RefreshCw size={16} className="animate-spin text-brand-500 shrink-0" />
              <span className="text-[13px] text-gray-600">Duke kontrolluar nëse anulimi është i mundshëm…</span>
            </div>
          )}
          {state.phase === "blocked" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-amber-800 mb-1">Anulimi nuk është i mundshëm</p>
                  <p className="text-[12px] text-amber-700 leading-relaxed">{state.reason}</p>
                </div>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Për të hequr të dhënat e këtij importi, duhet të fshini manualisht klientët e regjistruar.
              </p>
            </div>
          )}
          {state.phase === "confirm" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-red-800 mb-1">
                    Do të fshihen {state.caseCount} klientë dhe kreditë e tyre
                  </p>
                  <p className="text-[12px] text-red-700 leading-relaxed">
                    Ky veprim është <strong>i pakthyeshëm</strong>. Klientët e importuara nga ky skedar do të fshihen përgjithmonë.
                  </p>
                </div>
              </div>
              {state.cases.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Klientët që do të fshihen</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-32 overflow-y-auto">
                    {state.cases.map((ref) => (
                      <div key={ref} className="px-3 py-1.5 text-[12px] font-mono text-gray-700">{ref}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {state.phase === "deleting" && (
            <div className="flex items-center gap-3 py-4">
              <RefreshCw size={16} className="animate-spin text-red-500 shrink-0" />
              <span className="text-[13px] text-gray-600">Duke fshirë klientët…</span>
            </div>
          )}
          {state.phase === "done" && (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle size={15} className="text-emerald-500 shrink-0" />
              <p className="text-[13px] font-semibold text-emerald-800">{state.deleted} klientë u fshinë me sukses</p>
            </div>
          )}
          {state.phase === "error" && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700">{state.message}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          {(state.phase === "blocked" || state.phase === "error") && (
            <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Mbyll</button>
          )}
          {state.phase === "confirm" && (
            <>
              <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
              <button onClick={confirm}
                className="h-9 px-5 text-[13px] font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2">
                <RotateCcw size={13} /> Po, fshi klientët
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── History row ────────────────────────────────────────────────────────────────

function HistoryRow({ job, onRollback, showType }: { job: any; onRollback: () => void; showType?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showRollback, setShowRollback] = useState(false);
  const hasErrors = job.errors?.length > 0;
  const skippedRows = job.skippedRows ?? (job.totalRows - job.successfulRows - job.failedRows);
  const allSkipped = job.status === "COMPLETED" && (job.successfulRows ?? 0) === 0 && skippedRows > 0 && (job.failedRows ?? 0) === 0;
  const allFailed  = job.status === "COMPLETED" && (job.successfulRows ?? 0) === 0 && (job.failedRows ?? 0) > 0;
  const canShowRollback = job.status === "COMPLETED" && (job.successfulRows ?? 0) > 0 && job.importType === "PORTFOLIO";
  const canExpand = hasErrors || allSkipped || allFailed;

  return (
    <>
      {showRollback && (
        <RollbackModal job={job} onClose={() => setShowRollback(false)} onSuccess={onRollback} />
      )}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <FileSpreadsheet size={15} className="text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => canExpand && setOpen(v => !v)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-gray-900 truncate">{job.fileName}</span>
              {showType && job.importType && <TypeBadge importType={job.importType} />}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {fmtDate(job.createdAt)} · {job.uploadedBy?.fullName ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-3 text-[12px]">
              <span className="text-emerald-600 font-semibold">{fmt(job.successfulRows)} ✓</span>
              {(job.failedRows ?? 0) > 0 && <span className="text-red-500 font-semibold">{fmt(job.failedRows)} gabime</span>}
              {skippedRows > 0 && <span className="text-amber-600">{fmt(skippedRows)} anashkaluar</span>}
            </div>
            <StatusBadge status={job.status} allSkipped={allSkipped} />
            {canShowRollback && (
              <button onClick={() => setShowRollback(true)} title="Anulo importin"
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg transition-all">
                <RotateCcw size={11} /> Anulo
              </button>
            )}
            {canExpand && (
              <button onClick={() => setOpen(v => !v)} className="text-gray-400 hover:text-gray-600 p-0.5">
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>
        {open && (
          <>
            {allSkipped && (
              <div className="border-t border-amber-100 px-4 py-3 bg-amber-50/40 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-800">
                  Asnjë rekord i ri nuk u shtua — të gjitha <strong>{fmt(skippedRows)}</strong> rreshtat ekzistonin tashmë.
                </p>
              </div>
            )}
            {allFailed && (
              <div className="border-t border-red-100 px-4 py-3 bg-red-50/40 flex items-start gap-2">
                <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-800">
                  Të gjitha <strong>{fmt(job.failedRows)}</strong> rreshtat dështuan. Sigurohuni që po përdorni modelin e saktë.
                </p>
              </div>
            )}
            {hasErrors && (
              <div className="border-t border-red-100 divide-y divide-red-50 max-h-48 overflow-y-auto bg-red-50/30">
                {job.errors.map((e: any, i: number) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-2">
                    <span className="text-[11px] font-mono bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                      Rreshti {e.rowNumber}
                    </span>
                    <p className="text-[12px] text-gray-700">{e.errorMessage}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Mini history list (used at bottom of each section tab) ────────────────────

function MiniHistory({ jobs, loading, onRollback, emptyLabel }: {
  jobs: any[]; loading: boolean; onRollback: () => void; emptyLabel?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 5;
  const visible = showAll ? jobs : jobs.slice(0, LIMIT);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
        <History size={14} className="text-gray-400" />
        <span className="text-[13px] font-semibold text-gray-700">Historiku i Importeve</span>
        {!loading && jobs.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{jobs.length}</span>
        )}
      </div>
      <div className="p-4 space-y-2">
        {loading ? (
          [0, 1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileSpreadsheet size={24} className="text-gray-200 mb-2" />
            <p className="text-[12px] text-gray-400">{emptyLabel ?? "Asnjë import i regjistruar"}</p>
          </div>
        ) : (
          <>
            {visible.map(j => <HistoryRow key={j.id} job={j} onRollback={onRollback} />)}
            {jobs.length > LIMIT && (
              <button onClick={() => setShowAll(v => !v)}
                className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors px-1 mt-1">
                {showAll
                  ? <><ChevronUp size={13} /> Shfaq më pak</>
                  : <><ChevronDown size={13} /> Shfaq të gjitha ({jobs.length})</>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Reference codes panel (inline) ────────────────────────────────────────────

function ReferenceCodes({ data }: { data: { officers: any[]; institutions: any[]; cities: any[] } | null }) {
  const [tab, setTab] = useState<"officers" | "institutions" | "cities">("officers");
  if (!data) return <div className="px-5 py-4 text-[12px] text-gray-400">Duke ngarkuar…</div>;

  return (
    <div className="border-t border-gray-100">
      <div className="flex border-b border-gray-100 px-5">
        {([
          { key: "officers",      label: `Zyrtarët (${data.officers.length})` },
          { key: "institutions",  label: `Bankat (${data.institutions.length})` },
          { key: "cities",        label: `Qytetet (${data.cities.length})` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {label}
          </button>
        ))}
      </div>
      <div className="p-5 max-h-72 overflow-y-auto">
        {tab === "officers" && (
          <>
            <p className="text-[11px] text-gray-400 mb-3">
              Vendosni <strong className="text-gray-600">kodin numerik</strong> në kolonën{" "}
              <span className="font-mono bg-gray-100 px-1 rounded text-[10px]">collection_officer</span> të templateit.
            </p>
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              {data.officers.map((o, idx) => (
                <div key={o.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-3">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-brand-700 text-[11px] font-bold tabular">{o.userCode ?? idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-gray-800">{o.fullName}</div>
                    <div className="text-[11px] text-gray-400">{o.office?.name ?? ""} · {o.role}</div>
                  </div>
                  <CopyBtn text={String(o.userCode ?? idx + 1)} />
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "institutions" && (
          <>
            <p className="text-[11px] text-gray-400 mb-3">
              Vendosni <strong className="text-gray-600">kodin numerik</strong> në kolonën{" "}
              <span className="font-mono bg-gray-100 px-1 rounded text-[10px]">institution_name</span> të templateit.
            </p>
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              {data.institutions.map((inst: any) => (
                <div key={inst.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-brand-700 text-[11px] font-bold tabular">{inst.code}</span>
                  </div>
                  <span className="flex-1 text-[13px] text-gray-800">{inst.name}</span>
                  <span className="text-[11px] text-gray-400 font-mono">{inst.shortName}</span>
                  <CopyBtn text={String(inst.code)} />
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "cities" && (
          <>
            <p className="text-[11px] text-gray-400 mb-3">
              Vendosni <strong className="text-gray-600">kodin numerik</strong> në kolonën{" "}
              <span className="font-mono bg-gray-100 px-1 rounded text-[10px]">city</span> të templateit.
            </p>
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              {data.cities.map((city: any) => (
                <div key={city.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-brand-700 text-[11px] font-bold tabular">{city.code}</span>
                  </div>
                  <span className="flex-1 text-[13px] text-gray-800">{city.name}</span>
                  <CopyBtn text={String(city.code)} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Small upload card ──────────────────────────────────────────────────────────

function UploadCard({
  onUpload, onDone, successLabel,
}: {
  onUpload: (file: File) => Promise<{ total: number; succeeded: number; failed: number; errors: { row: number; ref: string; error: string }[] }>;
  onDone?: () => void;
  successLabel?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ total: number; succeeded: number; failed: number; errors: { row: number; ref: string; error: string }[] } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() { setFile(null); setResult(null); setError(""); }

  async function submit() {
    if (!file) return;
    setUploading(true); setResult(null); setError("");
    try {
      const r = await onUpload(file);
      setResult(r);
      setFile(null);
      onDone?.();
    } catch (e: any) {
      setError(e.message ?? "Ndodhi një gabim.");
    } finally { setUploading(false); }
  }

  if (result) {
    return (
      <div className="space-y-3">
        <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${result.failed === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          {result.failed === 0
            ? <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
            : <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />}
          <div className="text-[12px] text-gray-700 space-y-0.5">
            <div><span className="font-semibold text-emerald-700">{result.succeeded}</span> {successLabel ?? "rreshta"} u regjistruan me sukses</div>
            {result.failed > 0 && <div><span className="font-semibold text-amber-700">{result.failed}</span> rreshta dështuan</div>}
            <div className="text-gray-400">Gjithsej: {result.total}</div>
          </div>
        </div>
        {result.errors.length > 0 && (
          <div className="max-h-40 overflow-y-auto border border-red-100 rounded-xl bg-red-50 p-3 space-y-1">
            {result.errors.slice(0, 50).map((e, i) => (
              <div key={i} className="text-[11px] text-red-700">
                <span className="font-mono font-semibold">Rreshti {e.row} ({e.ref}):</span> {e.error}
              </div>
            ))}
            {result.errors.length > 50 && <div className="text-[11px] text-red-400">... dhe {result.errors.length - 50} gabime të tjera</div>}
          </div>
        )}
        <button onClick={reset} className="w-full py-2 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
          Importo skedar tjetër
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-8 cursor-pointer hover:border-brand-300 hover:bg-brand-50/40 transition-all">
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          <Upload size={18} className="text-gray-300" />
          <p className="text-[12px] text-gray-500">Tërhiq ose kliko për të zgjedhur</p>
          <p className="text-[11px] text-gray-400">Excel ose CSV</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 border border-brand-200 bg-brand-50 rounded-xl">
          <FileSpreadsheet size={15} className="text-brand-600 shrink-0" />
          <span className="flex-1 text-[12px] font-medium text-gray-800 truncate">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0">Ndrysho</button>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-700">{error}</p>
        </div>
      )}
      {file && (
        <button onClick={submit} disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl text-[13px] font-semibold transition-colors">
          {uploading
            ? <><RefreshCw size={14} className="animate-spin" /> Duke importuar…</>
            : <><Upload size={14} /> Importo</>}
        </button>
      )}
    </div>
  );
}

// ── TAB 1: Import Klient ───────────────────────────────────────────────────────

function ImportTab({
  file, setFile, uploading, result, error, onSubmit, onReset, refData, jobs, loadingJobs, onRollback,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  uploading: boolean;
  result: any;
  error: string;
  onSubmit: () => void;
  onReset: () => void;
  refData: { officers: any[]; institutions: any[]; cities: any[] } | null;
  jobs: any[];
  loadingJobs: boolean;
  onRollback: () => void;
}) {
  const [showRef, setShowRef] = useState(false);

  return (
    <div className="space-y-6">

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-[12px] text-gray-500 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
          <span>Shkarkoni templatein</span>
        </div>
        <ChevronRight size={12} className="text-gray-300 shrink-0" />
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
          <span>Plotësoni me të dhënat e bankës</span>
        </div>
        <ChevronRight size={12} className="text-gray-300 shrink-0" />
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
          <span>Ngarkoni skedarin</span>
        </div>
      </div>

      {/* Main 2-col */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

        {/* Left: Template */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">1</div>
            <h2 className="text-[14px] font-semibold text-gray-900">Shkarko Templatein</h2>
          </div>

          <a href={importApi.templateUrl()} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl transition-all group">
            <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 group-hover:border-brand-200 flex items-center justify-center shrink-0 transition-colors">
              <FileSpreadsheet size={16} className="text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">dlr-import-template.xlsx</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Modeli zyrtar i importit</div>
            </div>
            <Download size={14} className="text-gray-400 group-hover:text-brand-500 shrink-0 transition-colors" />
          </a>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fushat e templateit</p>
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden text-[12px] max-h-60 overflow-y-auto">
              {[
                { col: "full_name",                   req: true,  desc: "Emri i plotë i huamarrësit" },
                { col: "loan_number",                 req: true,  desc: "Numri unik i kredisë" },
                { col: "institution_name",            req: true,  desc: "Kodi numerik i bankës" },
                { col: "current_outstanding_balance", req: true,  desc: "Borxhi aktual (p.sh. 4500.00)" },
                { col: "personal_id",                 req: false, desc: "Numri personal i huamarrësit" },
                { col: "phone1",                      req: false, desc: "Numri kryesor i telefonit" },
                { col: "phone2",                      req: false, desc: "Numri alternativ i telefonit" },
                { col: "address",                     req: false, desc: "Adresa e plotë e banimit" },
                { col: "city",                        req: false, desc: "Kodi numerik i qytetit" },
                { col: "original_loan_amount",        req: false, desc: "Shuma origjinale e kredisë" },
                { col: "disbursement_date",           req: false, desc: "Data e disbursimit (YYYY-MM-DD)" },
                { col: "last_payment_date",           req: false, desc: "Data e pagesës së fundit (YYYY-MM-DD)" },
                { col: "collection_officer",          req: false, desc: "Kodi i zyratarit primar" },
                { col: "second_collection_officer",   req: false, desc: "Kodi i zyratarit sekondar" },
                { col: "guarantor_personal_id",       req: false, desc: "Numri personal i garantorit" },
                { col: "guarantor_phone",             req: false, desc: "Telefoni i garantorit" },
              ].map(({ col, req, desc }) => (
                <div key={col} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50">
                  <span className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{col}</span>
                  {req && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide shrink-0 mt-1.5">E DETYR.</span>}
                  <span className="text-gray-500 leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">Kreditë ekzistuese anashkalohen automatikisht.</p>
          </div>
        </div>

        {/* Right: Upload */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">2</div>
            <h2 className="text-[14px] font-semibold text-gray-900">Ngarko Skedarin</h2>
          </div>

          {result ? (
            <ResultPanel result={result} onReset={onReset} successLabel="klient" />
          ) : (
            <div className="flex flex-col flex-1 gap-3">
              {!file ? (
                <UploadZone onFile={(f) => setFile(f)} />
              ) : (
                <div className="flex items-center gap-3 p-4 border border-brand-200 bg-brand-50 rounded-xl">
                  <FileSpreadsheet size={18} className="text-brand-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">{file.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={onReset} className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors shrink-0">Ndrysho</button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-700">{error}</p>
                </div>
              )}

              {file && (
                <button onClick={onSubmit} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl text-[13px] font-semibold transition-colors">
                  {uploading ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg> Duke importuar…</>
                  ) : (
                    <><Upload size={14} /> Fillo Importin</>
                  )}
                </button>
              )}

              {!file && !result && (
                <p className="text-center text-[11px] text-gray-400 mt-auto pt-2">
                  Plotësoni templatein me të dhënat e bankës, pastaj ngarkojeni këtu.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reference codes toggle */}
      <div className="bg-white rounded-2xl border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <button onClick={() => setShowRef(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left">
          <div className="flex items-center gap-2.5">
            <Info size={14} className="text-gray-400" />
            <span className="text-[13px] font-semibold text-gray-700">Kodet e Referencës</span>
            <span className="text-[12px] text-gray-400 hidden sm:inline">— ID-të e zyrtarëve, bankave dhe qyteteve</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-gray-400">
            {!showRef && <span>Shiko kodet</span>}
            {showRef ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>
        {showRef && <ReferenceCodes data={refData} />}
      </div>

      {/* Per-section history */}
      <MiniHistory jobs={jobs} loading={loadingJobs} onRollback={onRollback} emptyLabel="Asnjë import klientësh i regjistruar" />
    </div>
  );
}

// ── TAB 2: Import Aktivitete ───────────────────────────────────────────────────

function ActivitiesTab({ jobs, loadingJobs, onRollback, onRefresh }: {
  jobs: any[]; loadingJobs: boolean; onRollback: () => void; onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-[13px] text-gray-500">
        Importoni aktivitete historike (thirrje, vizita, premtime, etj.) për klientët ekzistues në sistem.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Activity size={15} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900">Import Aktivitetesh</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">Aktivitete historike për rastet ekzistuese</p>
          </div>
        </div>

        <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div>
            <span className="text-[11px] font-semibold text-blue-700">Llojet (activity_type):</span>
            <p className="text-[11px] text-blue-600 font-mono mt-0.5 leading-relaxed">
              CALL, VISIT, SMS, EMAIL, LETTER, PROMISE_TO_PAY, PAYMENT_RECEIVED,<br />
              LEGAL_ACTION, NOTE, FIELD_VISIT, CALL_BORROWER, CALL_GUARANTOR,<br />
              VISIT_BORROWER, VISIT_GUARANTOR, WARNING_LETTER, MEETING_BORROWER, MEETING_GUARANTOR
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-blue-700">Rezultatet (outcome, opsionale):</span>
            <p className="text-[11px] text-blue-600 font-mono mt-0.5">
              CONTACTED, NO_ANSWER, PROMISE_RECEIVED, REFUSED,<br />
              PARTIAL_PAYMENT, FULL_PAYMENT, DISPUTE, DECEASED, OTHER
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Shkarko Templatein</p>
            <a
              href={importApi.templateActivitiesUrl()}
              download="dlr-template-aktivitetet.xlsx"
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={15} className="text-emerald-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-semibold text-gray-700 group-hover:text-brand-700">dlr-template-aktivitetet.xlsx</div>
                <div className="text-[11px] text-gray-400">case_reference · activity_type · date · officer_code · outcome · notes</div>
              </div>
              <Download size={13} className="text-gray-400 group-hover:text-brand-500 shrink-0" />
            </a>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Ngarko Skedarin</p>
            <UploadCard
              onUpload={(file) => importApi.importActivities(file)}
              onDone={onRefresh}
              successLabel="aktivitete"
            />
          </div>
        </div>
      </div>

      {/* Per-section history */}
      <MiniHistory jobs={jobs} loading={loadingJobs} onRollback={onRollback} emptyLabel="Asnjë import aktivitetesh i regjistruar" />
    </div>
  );
}

// ── TAB 3: Import Pagesa ───────────────────────────────────────────────────────

function PaymentsTab({ jobs, loadingJobs, onRollback, onRefresh }: {
  jobs: any[]; loadingJobs: boolean; onRollback: () => void; onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-[13px] text-gray-500">
        Importoni pagesa historike për klientët ekzistues në sistem.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <CreditCard size={15} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900">Import Pagesash</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">Pagesa historike për rastet ekzistuese</p>
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
          <div>
            <span className="text-[11px] font-semibold text-emerald-700">reference:</span>
            <span className="text-[11px] text-emerald-600"> nëse lihet bosh, gjenerohet automatikisht.</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-emerald-700">officer_code:</span>
            <span className="text-[11px] text-emerald-600"> opsional — nëse mungon, regjistrohet nën llogarinë tuaj.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Shkarko Templatein</p>
            <a
              href={importApi.templatePaymentsUrl()}
              download="dlr-template-pagesat.xlsx"
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={15} className="text-emerald-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-semibold text-gray-700 group-hover:text-brand-700">dlr-template-pagesat.xlsx</div>
                <div className="text-[11px] text-gray-400">case_reference · amount · date · reference · officer_code</div>
              </div>
              <Download size={13} className="text-gray-400 group-hover:text-brand-500 shrink-0" />
            </a>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Ngarko Skedarin</p>
            <UploadCard
              onUpload={(file) => importApi.importPayments(file)}
              onDone={onRefresh}
              successLabel="pagesa"
            />
          </div>
        </div>
      </div>

      {/* Per-section history */}
      <MiniHistory jobs={jobs} loading={loadingJobs} onRollback={onRollback} emptyLabel="Asnjë import pagesash i regjistruar" />
    </div>
  );
}

// ── TAB 4: Ndryshime te pjesshme ───────────────────────────────────────────────

type BulkType = "officer" | "secondary_officer" | "institution" | "city" | "category" | "balance" | "phone2" | "office" | "guarantor1" | "guarantor2";

const BULK_OPTIONS: { key: BulkType; label: string; desc: string }[] = [
  { key: "officer",           label: "Zyrtar kryesor",      desc: "Ndrysho zyrtar kryesor të rastit" },
  { key: "secondary_officer", label: "Zyrtar dytësor",      desc: "Ndrysho zyrtar dytësor" },
  { key: "office",            label: "Zyra",                 desc: "Ndrysho zyrën e caktuar" },
  { key: "institution",       label: "Institucioni",         desc: "Ndrysho bankën/institucionin" },
  { key: "city",              label: "Qyteti",               desc: "Ndrysho qytetin e huamarrësit" },
  { key: "category",          label: "Kategoria",            desc: "Ndrysho kategorinë (D1–D4, LEGAL)" },
  { key: "balance",           label: "Borgji aktual",        desc: "Ndrysho borgjin e mbetur" },
  { key: "phone2",            label: "Telefon alternativ",   desc: "Shto/ndrysho numrin e dytë" },
  { key: "guarantor1",        label: "Garanti 1",            desc: "Shto/ndrysho garantorin e parë" },
  { key: "guarantor2",        label: "Garanti 2",            desc: "Shto/ndrysho garantorin e dytë" },
];

function UpdatesTab({ officers, institutions, cities, offices }: { officers: any[]; institutions: any[]; cities: any[]; offices: any[] }) {
  const [type, setType] = useState<BulkType>("officer");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = BULK_OPTIONS.find(o => o.key === type)!;

  function reset() { setFile(null); setResult(null); setError(""); }
  function switchType(t: BulkType) { setType(t); reset(); }

  async function submit() {
    if (!file) return;
    setUploading(true); setResult(null); setError("");
    try {
      const r = await importApi.bulkUpdate(file, type);
      setResult(r);
      setFile(null);
    } catch (e: any) {
      setError(e.message ?? "Ndodhi një gabim.");
    } finally { setUploading(false); }
  }

  function downloadTemplate() {
    if (type === "guarantor1" || type === "guarantor2") {
      downloadExcel([
        { "Numri i Klientit (case_reference)": "Q71234567R", "Emri Mbiemri": "Arben Gashi", "Telefoni (opsional)": "+38344123456" },
        { "Numri i Klientit (case_reference)": "M31234567N", "Emri Mbiemri": "Vjosa Berisha", "Telefoni (opsional)": "+38344654321" },
        { "Numri i Klientit (case_reference)": "", "Emri Mbiemri": "", "Telefoni (opsional)": "" },
      ], `template-${type}`);
      return;
    }
    const colB = type === "officer" ? "Kodi i Zyratarit" : type === "secondary_officer" ? "Kodi i Zyratarit Dytësor" : type === "institution" ? "Kodi i Institucionit" : type === "city" ? "Kodi i Qytetit" : type === "office" ? "Kodi i Zyrës" : type === "category" ? "Kategoria (D1/D2/D3/D4/LEGAL)" : type === "balance" ? "Borgji Aktual" : "Numri i Telefonit të Dytë";
    const ex1 = type === "officer" || type === "secondary_officer" ? 3 : type === "institution" ? 4 : type === "city" ? 19 : type === "office" ? "PRK" : type === "category" ? "D2" : type === "balance" ? 4500.00 : "044123456";
    const ex2 = type === "officer" || type === "secondary_officer" ? 7 : type === "institution" ? 9 : type === "city" ? 5 : type === "office" ? "GJK" : type === "category" ? "D3" : type === "balance" ? 1200.50 : "045654321";
    downloadExcel([
      { "Numri i Klientit (case_reference)": "Q71234567R", [colB]: ex1 },
      { "Numri i Klientit (case_reference)": "M31234567N", [colB]: ex2 },
      { "Numri i Klientit (case_reference)": "", [colB]: "" },
    ], `template-${type}`);
  }

  function RefTable() {
    if (type === "officer" || type === "secondary_officer") return (
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
        {officers.map((o: any, idx: number) => (
          <div key={o.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-2 text-[12px]">
            <span className="w-7 font-mono font-bold text-brand-700 text-center shrink-0">{o.userCode ?? idx + 1}</span>
            <span className="flex-1 text-gray-800">{o.fullName}</span>
            <span className="text-gray-400 text-[11px] shrink-0">{o.office?.name ?? ""}</span>
            <CopyBtn text={String(o.userCode ?? idx + 1)} />
          </div>
        ))}
      </div>
    );
    if (type === "institution") return (
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
        {institutions.map((inst: any) => (
          <div key={inst.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-2 text-[12px]">
            <span className="w-7 font-mono font-bold text-brand-700 text-center shrink-0">{inst.code}</span>
            <span className="text-gray-800 flex-1">{inst.name}</span>
            <CopyBtn text={String(inst.code)} />
          </div>
        ))}
      </div>
    );
    if (type === "city") return (
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
        {cities.map((city: any) => (
          <div key={city.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-2 text-[12px]">
            <span className="w-7 font-mono font-bold text-brand-700 text-center shrink-0">{city.code}</span>
            <span className="text-gray-800 flex-1">{city.name}</span>
            <CopyBtn text={String(city.code)} />
          </div>
        ))}
      </div>
    );
    if (type === "office") return (
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
        {offices.map((o: any) => (
          <div key={o.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-2 text-[12px]">
            <span className="w-14 font-mono font-bold text-brand-700 shrink-0">{o.code}</span>
            <span className="flex-1 text-gray-800">{o.name}</span>
            <CopyBtn text={o.code} />
          </div>
        ))}
      </div>
    );
    if (type === "category") return (
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
        {[["D1","Faza 1 — Standarde"],["D2","Faza 2 — Me vëmendje"],["D3","Faza 3 — Nën standarde"],["D4","Faza 4 — Të dyshimta"],["LEGAL","Procedurë ligjore"]].map(([code, label]) => (
          <div key={code} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-2 text-[12px]">
            <span className="w-12 font-mono font-bold text-brand-700 shrink-0">{code}</span>
            <span className="flex-1 text-gray-800">{label}</span>
            <CopyBtn text={code} />
          </div>
        ))}
      </div>
    );
    if (type === "balance") return (
      <p className="text-[12px] text-gray-500 leading-relaxed">
        Kolonën B plotësoni me borgjin aktual si numër decimal, p.sh.{" "}
        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">4500.00</span>
      </p>
    );
    if (type === "phone2") return (
      <p className="text-[12px] text-gray-500 leading-relaxed">
        Kolonën B plotësoni me numrin e telefonit, p.sh.{" "}
        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">044123456</span>
      </p>
    );
    if (type === "guarantor1" || type === "guarantor2") return (
      <p className="text-[12px] text-gray-500 leading-relaxed">
        Kolona B: emri i plotë i garantorit (p.sh. <span className="font-mono bg-gray-100 px-1 rounded">Arben Gashi</span>).{" "}
        Kolona C (opsionale): numri i telefonit.
      </p>
    );
    return null;
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-gray-500">
        Ndryshoni një fushë specifike për shumë klientë njëherësh duke ngarkuar një Excel me dy kolona: numri i klientit dhe vlera e re.
      </p>

      {/* Type selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Çfarë dëshironi të ndryshoni?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {BULK_OPTIONS.map(({ key, label, desc }) => (
            <button key={key} onClick={() => switchType(key)}
              className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                type === key
                  ? "border-brand-400 bg-brand-50 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}>
              <div className={`text-[12px] font-semibold ${type === key ? "text-brand-700" : "text-gray-700"}`}>{label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected type: template + upload */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
            <Pencil size={14} className="text-brand-600" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-gray-900">{selected.label}</div>
            <div className="text-[12px] text-gray-400">{selected.desc}</div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Col 1: Reference table */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Kodet e Referencës</p>
            <RefTable />
          </div>

          {/* Col 2: Download template */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Shkarko Templatein</p>
            <button onClick={downloadTemplate}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl transition-all group">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-semibold text-gray-700 group-hover:text-brand-700">template-{type}.xlsx</div>
                <div className="text-[11px] text-gray-400 mt-0.5">case_reference · {selected.label.toLowerCase()}</div>
              </div>
              <Download size={13} className="text-gray-400 group-hover:text-brand-500 shrink-0" />
            </button>
            <p className="text-[11px] text-gray-400 mt-2.5 leading-relaxed">
              Hapeni në Excel, plotësoni të dhënat duke ndjekur shembujt, pastaj ngarkojeni.
            </p>
          </div>

          {/* Col 3: Upload */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Ngarko & Apliko</p>

            {result ? (
              <div className="space-y-3">
                <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                  <CheckCircle size={14} className={`shrink-0 mt-0.5 ${result.errors.length === 0 ? "text-emerald-600" : "text-amber-600"}`} />
                  <div className="text-[12px]">
                    <span className={`font-semibold ${result.errors.length === 0 ? "text-emerald-800" : "text-amber-800"}`}>
                      {result.updated} klientë u përditësuan
                    </span>
                    {result.skipped > 0 && <span className="text-gray-500 ml-2">· {result.skipped} anashkaluar</span>}
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
                    {result.errors.map((e: string, i: number) => (
                      <p key={i} className="text-[11px] text-red-700">{e}</p>
                    ))}
                  </div>
                )}
                <button onClick={reset} className="text-[12px] text-brand-600 hover:underline">Ngarko dokument tjetër</button>
              </div>
            ) : (
              <div className="space-y-3">
                {!file ? (
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-8 cursor-pointer hover:border-brand-300 hover:bg-brand-50/40 transition-all">
                    <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
                    <Upload size={18} className="text-gray-300" />
                    <p className="text-[12px] text-gray-500 text-center">Tërhiq ose kliko</p>
                    <p className="text-[11px] text-gray-400">Excel ose CSV</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border border-brand-200 bg-brand-50 rounded-xl">
                    <FileSpreadsheet size={15} className="text-brand-600 shrink-0" />
                    <span className="flex-1 text-[12px] font-medium text-gray-800 truncate">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0">Ndrysho</button>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-700">{error}</p>
                  </div>
                )}

                {file && (
                  <button onClick={submit} disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl text-[13px] font-semibold transition-colors">
                    {uploading
                      ? <><RefreshCw size={14} className="animate-spin" /> Duke aplikuar…</>
                      : <><Upload size={14} /> Apliko Ndryshimet</>}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB 5: Historiku (unified) ────────────────────────────────────────────────

function HistoryTab({ jobs, loadingJobs, onRollback }: { jobs: any[]; loadingJobs: boolean; onRollback: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 10;
  const visible = showAll ? jobs : jobs.slice(0, LIMIT);

  if (loadingJobs) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200">
        <FileSpreadsheet size={28} className="text-gray-200 mb-3" />
        <p className="text-[13px] font-medium text-gray-400">Ende nuk ka importe të kryera</p>
        <p className="text-[12px] text-gray-300 mt-1">Historiku i importeve do të shfaqet këtu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map(j => (
        <HistoryRow key={j.id} job={j} onRollback={onRollback} showType />
      ))}
      {jobs.length > LIMIT && (
        <button onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors px-1 mt-1">
          {showAll
            ? <><ChevronUp size={13} /> Shfaq më pak</>
            : <><ChevronDown size={13} /> Shfaq të gjitha ({jobs.length})</>}
        </button>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = "clients" | "activities" | "payments" | "updates" | "history";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "clients",    label: "Import Klient",          icon: Users },
  { key: "activities", label: "Import Aktivitete",      icon: Activity },
  { key: "payments",   label: "Import Pagesa",          icon: CreditCard },
  { key: "updates",    label: "Ndryshime te pjesshme",  icon: Pencil },
  { key: "history",    label: "Historiku",              icon: History },
];

export default function ImportPage() {
  const [tab, setTab] = useState<Tab>("clients");

  // Main client import state
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState("");

  // All jobs (split by type in render)
  const [jobs, setJobs]               = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [refData, setRefData]         = useState<{ officers: any[]; institutions: any[]; cities: any[]; offices: any[] } | null>(null);

  function refreshJobs() {
    importApi.jobs().then(setJobs).catch(() => {});
  }

  useEffect(() => {
    importApi.jobs().then(setJobs).catch(() => {}).finally(() => setLoadingJobs(false));
    importApi.referenceData().then(setRefData).catch(() => {});
  }, []);

  // Split jobs by type
  const clientJobs   = jobs.filter(j => j.importType === "PORTFOLIO");
  const activityJobs = jobs.filter(j => j.importType === "ACTIVITIES");
  const paymentJobs  = jobs.filter(j => j.importType === "PAYMENTS");

  async function submit() {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const res = await importApi.upload(file);
      if (res?.status === "PROCESSING" && res?.jobId) {
        const poll = async () => {
          const allJobs = await importApi.jobs();
          setJobs(allJobs);
          const job = allJobs.find((j: any) => j.id === res.jobId);
          if (!job || job.status === "PROCESSING") {
            setTimeout(poll, 2000);
          } else {
            setResult({
              jobId: job.id, fileName: job.fileName,
              total: job.totalRows, succeeded: job.successfulRows,
              failed: job.failedRows,
              skipped: job.totalRows - job.successfulRows - job.failedRows,
              errors: job.errors?.map((e: any) => ({ row: e.rowNumber, loan_number: "", error: e.errorMessage })) ?? [],
            });
            setUploading(false);
          }
        };
        poll();
      } else {
        setResult(res);
        importApi.jobs().then(setJobs).catch(() => {});
        setUploading(false);
      }
    } catch (e: any) {
      setError(e.message ?? "Ndodhi një gabim gjatë importit.");
      setUploading(false);
    }
  }

  function reset() { setFile(null); setResult(null); setError(""); setUploading(false); }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="Import Portofoli" subtitle="Menaxhoni importin e klientëve dhe ndryshimet në portofol" help={[
        { title: "Si funksionon importi?", body: "Importi ju lejon të ngarkoni dhjetëra ose qindra klientë, aktivitete ose pagesa njëherësh nga një skedar Excel. Shkarkoni shabllonin e gatshëm, plotësoni të dhënat në Excel, pastaj ngarkoni skedarin duke e tërhequr në zonën e ngarkimit ose duke klikuar 'Zgjidhni Skedarin'." },
        { title: "Si të shkarkoni shabllonet", body: "Çdo seksion (Klientë, Aktivitete, Pagesa) ka butonin e vet 'Shkarko Shabllon'. Hapeni në Excel — rreshti i parë është titulli i kolonave dhe nuk duhet ndryshuar. Rreshti i dytë është shembull — fshijeni përpara ngarkimit. Plotësoni të dhënat nga rreshti 2 e tutje." },
        { title: "Gabime gjatë importit — çfarë bëj?", body: "Pasi të ngarkoni skedarin, sistemi kontrollon çdo rresht. Nëse ka gabime (p.sh. referencë e pavlefshme, datë e formatit të gabuar), shfaqet lista e gabimeve me numrin e rreshtit dhe problemin. Hapeni skedarin tuaj Excel, korrigjoni ato rreshta dhe ringarkoini skedarin." },
        { title: "Si të anuloni një import të bërë gabimisht", body: "Importet e klientëve mund të anulohen nëse janë bërë gabimisht — klikoni ikonën e anulimit (⟲) pranë importit në historik. Kjo fshin të gjithë klientët e importuar nga ai skedar. Vini re: aktivitetet dhe pagesat e importuara nuk mund të anulohen automatikisht." },
        { title: "Sa rreshta mund të importoj njëherësh?", body: "Nuk ka kufizim të fiks, por rekomandojmë maksimum 5,000 rreshta për skedar për performancë optimale. Për portofole të mëdha, ndajeni skedarin në disa pjesë. Sistemi tregon progresin gjatë importit." },
      ]} />

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3.5 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
                tab === key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon size={14} />
              {label}
              {key === "history" && jobs.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === key ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                  {jobs.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content — full width, just padding */}
      <div className="p-4 md:p-6">
        {tab === "clients" && (
          <ImportTab
            file={file}
            setFile={setFile}
            uploading={uploading}
            result={result}
            error={error}
            onSubmit={submit}
            onReset={reset}
            refData={refData}
            jobs={clientJobs}
            loadingJobs={loadingJobs}
            onRollback={refreshJobs}
          />
        )}
        {tab === "activities" && (
          <ActivitiesTab
            jobs={activityJobs}
            loadingJobs={loadingJobs}
            onRollback={refreshJobs}
            onRefresh={refreshJobs}
          />
        )}
        {tab === "payments" && (
          <PaymentsTab
            jobs={paymentJobs}
            loadingJobs={loadingJobs}
            onRollback={refreshJobs}
            onRefresh={refreshJobs}
          />
        )}
        {tab === "updates" && (
          <UpdatesTab
            officers={refData?.officers ?? []}
            institutions={refData?.institutions ?? []}
            cities={refData?.cities ?? []}
            offices={refData?.offices ?? []}
          />
        )}
        {tab === "history" && (
          <HistoryTab jobs={jobs} loadingJobs={loadingJobs} onRollback={refreshJobs} />
        )}
      </div>
    </div>
  );
}
