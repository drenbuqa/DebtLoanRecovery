"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { importApi } from "@/lib/api";
import {
  Upload, Download, CheckCircle, XCircle, AlertTriangle,
  FileSpreadsheet, Clock, RotateCcw, ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("sq-AL"); }
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString("sq-AL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-12 cursor-pointer transition-all select-none
        ${drag ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50"}`}
    >
      <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
        onChange={(e) => handle(e.target.files?.[0])} />
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${drag ? "bg-brand-100" : "bg-white border border-gray-200"}`}>
        <Upload size={20} className={drag ? "text-brand-600" : "text-gray-400"} />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-semibold text-gray-800">Tërhiq dokumentin këtu ose kliko për ta zgjedhur</p>
        <p className="text-[12px] text-gray-400 mt-0.5">Excel ose CSV · maks. 50 MB</p>
      </div>
    </div>
  );
}

// ── Result panel ───────────────────────────────────────────────────────────────

function ResultPanel({ result, onReset }: { result: any; onReset: () => void }) {
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
          <div key={label} className={`${bg} rounded-xl border border-gray-200 px-4 py-3.5`}
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</div>
            <div className={`text-[26px] font-bold tabular ${color}`}>{fmt(val)}</div>
          </div>
        ))}
      </div>

      {allFailed ? (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-red-800">Importi dështoi</p>
            <p className="text-[12px] text-red-600 mt-0.5">Të gjitha rreshtat kishin gabime. Kontrolloni se po përdorni modelin e saktë.</p>
          </div>
        </div>
      ) : result.skipped === result.total ? (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Asnjë klient i ri</p>
            <p className="text-[12px] text-amber-600 mt-0.5">Të gjitha kreditë ekzistojnë tashmë — sistemi anashkalon automatikisht dublikatat.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-800">
              {fmt(result.succeeded)} klient{result.succeeded !== 1 ? "ë" : ""} u shtuan me sukses
            </p>
            {result.skipped > 0 && (
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
                    <span className="text-[11px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Rreshti {e.row}</span>
                    {e.loan_number && !e.loan_number.startsWith("row-") && (
                      <span className="text-[11px] text-gray-400 font-mono">{e.loan_number}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-700">{e.error}</p>
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

// ── History row ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; dot: string }> = {
    COMPLETED:  { label: "Përfunduar",     color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    FAILED:     { label: "Anuluar",        color: "bg-gray-100 text-gray-500",      dot: "bg-gray-400" },
    PROCESSING: { label: "Duke procesuar", color: "bg-amber-50 text-amber-700",     dot: "bg-amber-500" },
    PENDING:    { label: "Në pritje",      color: "bg-gray-100 text-gray-600",      dot: "bg-gray-400" },
  };
  const m = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.label}
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

function RollbackModal({
  job,
  onClose,
  onSuccess,
}: {
  job: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, setState] = useState<RollbackState>({ phase: "checking" });

  useEffect(() => {
    importApi
      .rollbackCheck(job.id)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <RotateCcw size={15} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-gray-900">Anulo Importin</div>
            <div className="text-[11px] text-gray-400 truncate">{job.fileName}</div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors p-1">
            <XCircle size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {state.phase === "checking" && (
            <div className="flex items-center gap-3 py-4">
              <svg className="animate-spin h-4 w-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
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
              <p className="text-[12px] text-gray-500">
                Për të anuluar këtë import, duhet të fshini manualisht të dhënat e regjistruara pas importit.
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
                    Ky veprim është i pakthyeshëm. Klientët e importuara nga ky skedar do të fshihen përgjithmonë.
                  </p>
                </div>
              </div>
              {state.cases.length > 0 && (
                <div className="border border-gray-100 rounded-lg max-h-32 overflow-y-auto">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Klientët që do të fshihen</span>
                  </div>
                  <div className="divide-y divide-gray-50">
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
              <svg className="animate-spin h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-[13px] text-gray-600">Duke fshirë klientët…</span>
            </div>
          )}

          {state.phase === "done" && (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle size={15} className="text-emerald-500 shrink-0" />
              <p className="text-[13px] font-semibold text-emerald-800">
                {state.deleted} klientë u fshinë me sukses
              </p>
            </div>
          )}

          {state.phase === "error" && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700">{state.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-4">
          {(state.phase === "blocked" || state.phase === "error") && (
            <button onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Mbyll
            </button>
          )}
          {state.phase === "confirm" && (
            <>
              <button onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Anulo
              </button>
              <button onClick={confirm}
                className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                Po, fshi klientët
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ job, onRollback }: { job: any; onRollback: () => void }) {
  const [open, setOpen] = useState(false);
  const [showRollback, setShowRollback] = useState(false);
  const hasErrors = job.errors?.length > 0;
  const canShowRollback = job.status === "COMPLETED" && (job.successfulRows ?? 0) > 0;

  return (
    <>
      {showRollback && (
        <RollbackModal
          job={job}
          onClose={() => setShowRollback(false)}
          onSuccess={onRollback}
        />
      )}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3 px-4 py-3 transition-colors">
          <FileSpreadsheet size={15} className="text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => hasErrors && setOpen(v => !v)}>
            <div className="text-[13px] font-medium text-gray-900 truncate">{job.fileName}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {fmtDate(job.createdAt)} · {job.uploadedBy?.fullName ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-3 text-[12px]">
              <span className="text-emerald-600 font-semibold">{fmt(job.successfulRows)} ✓</span>
              {job.failedRows  > 0 && <span className="text-red-500 font-semibold">{fmt(job.failedRows)} ✗</span>}
              {job.skippedRows > 0 && <span className="text-gray-400">{fmt(job.skippedRows)} ~</span>}
            </div>
            <StatusBadge status={job.status} />
            {canShowRollback && (
              <button
                onClick={() => setShowRollback(true)}
                title="Anulo importin"
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg transition-all">
                <RotateCcw size={11} /> Anulo
              </button>
            )}
            {hasErrors && (
              <button onClick={() => setOpen(v => !v)} className="text-gray-400 hover:text-gray-600 p-0.5">
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>
        {open && hasErrors && (
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
      </div>
    </>
  );
}

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

// ── Static reference maps ──────────────────────────────────────────────────────

const CITY_CODES: Record<number, string> = {
  1:'Decan',2:'Drenas',3:'Ferizaj',4:'Fushë Kosovë',5:'Gjilan',6:'Gllogovc/Drenas',
  7:'Gracanica',8:'Istog',9:'Kamenicë',10:'Klina',11:'Klinë',12:'Leposavic',
  13:'Lipjan',14:'Malishevë',15:'Mitrovicë',16:'Obilic',17:'Pejë',18:'Podujevë',
  19:'Prishtinë',20:'Prizren',21:'Shtime',22:'Skënderaj',23:'Suharekë',24:'Unknown',
  25:'Viti',26:'Vushtrri',27:'Zubin Potok',28:'Zvecan',29:'Novo Berdo',30:'Kacanik',
  31:'Gjakovë',32:'Dragash',33:'Rahovec',
};

const INSTITUTION_CODES: Record<number, string> = {
  1:'BZMF',2:'Banka Ekonomike',3:'TEB',4:'KosInvest',5:'Atlantic Capital Partners',
  6:'Banka Kombëtare Tregtare',7:'Banka Private e Biznesit',8:'NLB',9:'ProCredit Bank',
  10:'Crimson Finance Found',11:'KGMAMF',12:'Klientet migruar gabim',13:'IuteCredit',
  14:'Kujtesa',15:'PADEFIUNUAR',16:'TIMI INVEST',17:'MCA',18:'BKS',19:'IPKO',
  20:'RBKO',21:'Finca',22:'Cia Berto',23:'Biznese private',24:'NOA',
  25:'Ziraat Bankasi',26:'TIMI INVEST',
};

const NPL_CODES: Record<number, string> = {
  1:'PERFORMING',2:'WATCH',3:'SUBSTANDARD',4:'DOUBTFUL',5:'LOSS',
};

// ── Reference panel ────────────────────────────────────────────────────────────

function ReferencePanel() {
  const [data, setData] = useState<{ officers: any[]; institutions: any[]; cities: string[]; nplCategories: string[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"officers" | "institutions" | "cities" | "npl">("officers");

  useEffect(() => {
    importApi.referenceData().then(setData).catch(() => {});
  }, []);

  const NPL_DESC: Record<string, string> = {
    PERFORMING: "Kredi aktive, pa vonesë",
    WATCH: "Vonesë 1–90 ditë",
    SUBSTANDARD: "Vonesë 91–180 ditë",
    DOUBTFUL: "Vonesë 181–360 ditë",
    LOSS: "Vonesë mbi 360 ditë",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div>
          <div className="text-[14px] font-semibold text-gray-900">Vlerat e referencës</div>
          <div className="text-[12px] text-gray-400 mt-0.5">ID-të e zyrtarëve, emrat e institucioneve, qytetet dhe kategoritë NPL</div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && data && (
        <div className="border-t border-gray-100">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-5">
            {([
              { key: "officers", label: `Zyrtarët (${data.officers.length})` },
              { key: "institutions", label: `Bankat (${Object.keys(INSTITUTION_CODES).length})` },
              { key: "cities", label: `Qytetet (${Object.keys(CITY_CODES).length})` },
              { key: "npl", label: "Kategoria NPL" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-3 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "officers" && (
              <div className="space-y-1">
                <p className="text-[11px] text-gray-400 mb-3">
                  Kopjoni kodin numerik dhe vendoseni në kolonën <span className="font-mono bg-gray-100 px-1 rounded">assigned_officer_id</span> ose <span className="font-mono bg-gray-100 px-1 rounded">secondary_officer_id</span> kur përdorni ndryshime me Excel.
                </p>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                  {data.officers.map((o, idx) => {
                    const code = o.userCode ?? idx + 1;
                    return (
                      <div key={o.id} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-3">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                          <span className="text-brand-700 text-[11px] font-bold tabular">{code}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-gray-800">{o.fullName}</div>
                          <div className="text-[11px] text-gray-400">{o.office?.name ?? ""} · {o.role}</div>
                        </div>
                        <CopyBtn text={String(code)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "institutions" && (
              <div>
                <p className="text-[11px] text-gray-400 mb-3">
                  Kopjoni <span className="font-semibold text-gray-600">kodin numerik</span> dhe vendoseni në kolonën <span className="font-mono bg-gray-100 px-1 rounded">institution_name</span> kur përdorni ndryshime me Excel.
                </p>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                  {Object.entries(INSTITUTION_CODES).map(([code, name]) => (
                    <div key={code} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-brand-700 text-[11px] font-bold tabular">{code}</span>
                      </div>
                      <span className="flex-1 text-[13px] text-gray-800">{name}</span>
                      <CopyBtn text={String(code)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "cities" && (
              <div>
                <p className="text-[11px] text-gray-400 mb-3">
                  Kopjoni <span className="font-semibold text-gray-600">kodin numerik</span> dhe vendoseni në kolonën <span className="font-mono bg-gray-100 px-1 rounded">city</span> kur përdorni ndryshime me Excel.
                </p>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                  {Object.entries(CITY_CODES).map(([code, name]) => (
                    <div key={code} className="flex items-center px-3 py-2 hover:bg-gray-50 gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-brand-700 text-[11px] font-bold tabular">{code}</span>
                      </div>
                      <span className="flex-1 text-[13px] text-gray-800">{name}</span>
                      <CopyBtn text={String(code)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "npl" && (
              <div>
                <p className="text-[11px] text-gray-400 mb-3">
                  Kopjoni vlerën dhe vendoseni në kolonën <span className="font-mono bg-gray-100 px-1 rounded">npl_classification</span>.
                </p>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                  {Object.entries(NPL_DESC).map(([cat, desc]) => (
                    <div key={cat} className="flex items-center px-3 py-2.5 hover:bg-gray-50 gap-3">
                      <span className="font-mono text-[13px] font-semibold text-gray-800 w-32">{cat}</span>
                      <span className="text-[12px] text-gray-400 flex-1">{desc}</span>
                      <CopyBtn text={cat} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bulk update panel ──────────────────────────────────────────────────────────

type BulkType = "officer" | "npl" | "institution" | "city";

const BULK_TYPE_OPTIONS: { key: BulkType; label: string; desc: string }[] = [
  { key: "officer",     label: "Zyrtar",        desc: "Ndrysho oficerina e klientit" },
  { key: "npl",         label: "Kategoria NPL",  desc: "Ndrysho klasifikimin NPL të kredisë" },
  { key: "institution", label: "Institucioni",   desc: "Ndrysho bankën/institucionin e kredisë" },
  { key: "city",        label: "Qyteti",         desc: "Ndrysho qytetin e huamarrësit" },
];

function BulkUpdatePanel({ officers }: { officers: any[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<BulkType>("officer");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() { setFile(null); setResult(null); setError(""); }

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

  // Reference table for the selected type
  function CodeTable() {
    if (type === "officer") {
      return (
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
          {officers.map((o, idx) => (
            <div key={o.id} className="flex items-center px-3 py-1.5 hover:bg-gray-50 gap-2 text-[12px]">
              <span className="w-7 font-mono font-bold text-brand-700 text-center">{o.userCode ?? idx + 1}</span>
              <span className="flex-1 text-gray-800">{o.fullName}</span>
              <span className="text-gray-400 text-[11px]">{o.office?.name ?? ""}</span>
            </div>
          ))}
          {officers.length === 0 && <p className="px-3 py-2 text-[12px] text-gray-400">Duke ngarkuar…</p>}
        </div>
      );
    }
    if (type === "npl") {
      const descs: Record<string,string> = { PERFORMING:"Pa vonesë",WATCH:"1–90 ditë",SUBSTANDARD:"91–180 ditë",DOUBTFUL:"181–360 ditë",LOSS:"mbi 360 ditë" };
      return (
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
          {Object.entries(descs).map(([val, desc]) => (
            <div key={val} className="flex items-center px-3 py-1.5 hover:bg-gray-50 gap-2 text-[12px]">
              <span className="font-mono font-semibold text-gray-800 w-28">{val}</span>
              <span className="text-gray-400 flex-1">{desc}</span>
              <CopyBtn text={val} />
            </div>
          ))}
        </div>
      );
    }
    if (type === "institution") {
      return (
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
          {Object.entries(INSTITUTION_CODES).map(([code, val]) => (
            <div key={code} className="flex items-center px-3 py-1.5 hover:bg-gray-50 gap-2 text-[12px]">
              <span className="w-7 font-mono font-bold text-brand-700 text-center">{code}</span>
              <span className="text-gray-800">{val}</span>
            </div>
          ))}
        </div>
      );
    }
    // city
    return (
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
        {Object.entries(CITY_CODES).map(([code, val]) => (
          <div key={code} className="flex items-center px-3 py-1.5 hover:bg-gray-50 gap-2 text-[12px]">
            <span className="w-7 font-mono font-bold text-brand-700 text-center">{code}</span>
            <span className="text-gray-800">{val}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <button onClick={() => { setOpen((v) => !v); reset(); }}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div>
          <div className="text-[14px] font-semibold text-gray-900">Ndryshime të Pjesshme</div>
          <div className="text-[12px] text-gray-400 mt-0.5">Ndrysho zyrtar, kategori NPL, institucion ose qytet me ngarkesë Excel</div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-5">

          {/* Type selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {BULK_TYPE_OPTIONS.map(({ key, label, desc }) => (
              <button key={key} onClick={() => { setType(key); reset(); }}
                className={`px-3 py-3 rounded-xl border text-left transition-all ${
                  type === key
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}>
                <div className="text-[13px] font-semibold">{label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Left: code reference */}
            <div>
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Kodet e referencës · {BULK_TYPE_OPTIONS.find(t => t.key === type)!.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Kolona A = numri i klientit &nbsp;·&nbsp; Kolona B = kodi
                </p>
              </div>
              <CodeTable />
            </div>

            {/* Right: upload */}
            <div className="flex flex-col gap-3">
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Ngarko Dokumentin Excel
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Ngarkoni dokumentin me ndryshimet e përgatitura
                </p>
              </div>

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
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-[11px] text-red-700">{e}</p>
                      ))}
                    </div>
                  )}
                  <button onClick={reset} className="text-[12px] text-brand-600 hover:underline">
                    Ngarko dokument tjetër
                  </button>
                </div>
              ) : (
                <>
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
                      <p className="text-[11px] text-gray-400">Kolona A: numri i klientit · Kolona B: kodi</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 border border-brand-200 bg-brand-50 rounded-xl">
                      <FileSpreadsheet size={16} className="text-brand-600 shrink-0" />
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
                      className="flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg text-[13px] font-medium transition-colors">
                      {uploading ? (
                        <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Duke aplikuar…</>
                      ) : (
                        <><Upload size={14} /> Apliko Ndryshimet</>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState("");
  const [jobs, setJobs]           = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [officers, setOfficers]   = useState<any[]>([]);

  useEffect(() => {
    importApi.jobs().then(setJobs).catch(() => {}).finally(() => setLoadingJobs(false));
    importApi.referenceData().then((d) => setOfficers(d.officers)).catch(() => {});
  }, []);

  function handleFile(f: File) { setFile(f); setResult(null); setError(""); }

  async function submit() {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const res = await importApi.upload(file);
      setResult(res);
      importApi.jobs().then(setJobs).catch(() => {});
    } catch (e: any) {
      setError(e.message ?? "Ndodhi një gabim gjatë importit.");
    } finally { setUploading(false); }
  }

  function reset() { setFile(null); setResult(null); setError(""); }

  return (
    <div>
      <Topbar title="Import Portofoli" subtitle="Shtoni klientë të rinj nga dokumentet e bankave" />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── How it works ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              n: "1", icon: Download, color: "bg-blue-50 text-blue-600",
              title: "Shkarkoni modelin",
              desc: "Merrni dokumentin Excel me kolonat e sakta.",
            },
            {
              n: "2", icon: FileSpreadsheet, color: "bg-amber-50 text-amber-600",
              title: "Kopjoni të dhënat",
              desc: "Kopjoni të dhënat e bankës në kolonat përkatëse të modelit.",
            },
            {
              n: "3", icon: Upload, color: "bg-emerald-50 text-emerald-600",
              title: "Ngarkoni dhe importoni",
              desc: "Ngarkoni modelin e plotësuar. Sistemi shton klientët automatikisht.",
            },
          ].map(({ n, icon: Icon, color, title, desc }) => (
            <div key={n} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={17} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Hapi {n}</div>
                <div className="text-[13px] font-semibold text-gray-900 mb-0.5">{title}</div>
                <div className="text-[12px] text-gray-500 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main card ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

          {/* Left: Template */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900 mb-1">Modeli i importit</h2>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Shkarkoni modelin, hapeni në Excel, dhe kopjoni të dhënat nga dokumenti i bankës në kolonat përkatëse. Mund të lini bosh kolonat që banka nuk i ka.
              </p>
            </div>

            <a href={importApi.templateUrl()} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-medium transition-colors">
              <Download size={14} /> Shkarko Modelin Excel
            </a>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fusha të detyrueshme</p>
              <div className="flex flex-wrap gap-1.5">
                {["full_name", "loan_number", "institution_name", "current_outstanding_balance"].map(c => (
                  <span key={c} className="text-[11px] font-mono bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-700">{c}</span>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Kreditë që ekzistojnë tashmë anashkalohen automatikisht pa gabim.
              </p>
            </div>
          </div>

          {/* Right: Upload */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h2 className="text-[14px] font-semibold text-gray-900 mb-1">Ngarko dokumentin</h2>
            <p className="text-[12px] text-gray-500 mb-4">Ngarkoni modelin e plotësuar me të dhënat e klientëve.</p>

            {result ? (
              <ResultPanel result={result} onReset={reset} />
            ) : (
              <div className="space-y-3">
                {!file ? (
                  <UploadZone onFile={handleFile} />
                ) : (
                  <div className="flex items-center gap-3 p-4 border border-brand-200 bg-brand-50 rounded-xl">
                    <FileSpreadsheet size={18} className="text-brand-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 truncate">{file.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={reset} className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                      Ndrysho
                    </button>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-700">{error}</p>
                  </div>
                )}

                {file && (
                  <button onClick={submit} disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg text-[13px] font-medium transition-colors">
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Duke importuar…
                      </>
                    ) : (
                      <><Upload size={14} /> Fillo Importin</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Reference data ───────────────────────── */}
        <ReferencePanel />

        {/* ── Bulk partial updates ─────────────────── */}
        <BulkUpdatePanel officers={officers} />

        {/* ── History ───────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-700">Historiku i Importeve</h2>
          </div>
          {loadingJobs ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-200">
              <FileSpreadsheet size={26} className="text-gray-200 mb-2" />
              <p className="text-[13px] text-gray-400">Ende nuk ka importe të kryera</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map(j => (
                <HistoryRow
                  key={j.id}
                  job={j}
                  onRollback={() => importApi.jobs().then(setJobs).catch(() => {})}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
