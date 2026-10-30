"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { importApi } from "@/lib/api";
import {
  Upload, Download, CheckCircle, XCircle, AlertTriangle,
  FileSpreadsheet, Clock, RotateCcw, ChevronDown, ChevronUp, Copy, Check, X, RefreshCw,
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
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-12 cursor-pointer transition-all select-none flex-1
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
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

        {/* Body */}
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          {(state.phase === "blocked" || state.phase === "error") && (
            <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Mbyll
            </button>
          )}
          {state.phase === "confirm" && (
            <>
              <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Anulo
              </button>
              <button onClick={confirm}
                className="h-9 px-5 text-[13px] font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2">
                <RotateCcw size={13} />
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
  const skippedRows = job.skippedRows ?? (job.totalRows - job.successfulRows - job.failedRows);
  const allSkipped = job.status === "COMPLETED" && (job.successfulRows ?? 0) === 0 && skippedRows > 0 && (job.failedRows ?? 0) === 0;
  const allFailed  = job.status === "COMPLETED" && (job.successfulRows ?? 0) === 0 && (job.failedRows ?? 0) > 0;
  const canShowRollback = job.status === "COMPLETED" && (job.successfulRows ?? 0) > 0;
  const canExpand = hasErrors || allSkipped || allFailed;

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
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => canExpand && setOpen(v => !v)}>
            <div className="text-[13px] font-medium text-gray-900 truncate">{job.fileName}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {fmtDate(job.createdAt)} · {job.uploadedBy?.fullName ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-3 text-[12px]">
              <span className="text-emerald-600 font-semibold" title="Importuar me sukses">{fmt(job.successfulRows)} ✓</span>
              {(job.failedRows ?? 0) > 0 && (
                <span className="text-red-500 font-semibold" title="Dështuan">{fmt(job.failedRows)} gabime</span>
              )}
              {skippedRows > 0 && (
                <span className="text-amber-600" title="Ekzistonin tashmë — anashkaluar">{fmt(skippedRows)} anashkaluar</span>
              )}
            </div>
            <StatusBadge status={job.status} allSkipped={allSkipped} />
            {canShowRollback && (
              <button
                onClick={() => setShowRollback(true)}
                title="Anulo importin"
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
            {(allSkipped) && (
              <div className="border-t border-amber-100 px-4 py-3 bg-amber-50/40 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-800">
                  Asnjë klient i ri nuk u shtua — të gjitha <strong>{fmt(skippedRows)}</strong> kreditë ekzistonin tashmë në sistem. Nëse ky nuk ishte rezultati i pritur, kontrolloni nëse keni importuar tashmë këtë skedar ose nëse numrat e kredive janë duplikatë.
                </p>
              </div>
            )}
            {(allFailed) && (
              <div className="border-t border-red-100 px-4 py-3 bg-red-50/40 flex items-start gap-2">
                <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-800">
                  Të gjitha <strong>{fmt(job.failedRows)}</strong> rreshtat dështuan. Shihni gabimet më poshtë dhe sigurohuni që po përdorni modelin e saktë të importit.
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

// Static maps removed — all reference data now loaded from DB via referenceData API

// ── Reference panel ────────────────────────────────────────────────────────────

function ReferencePanel() {
  const [data, setData] = useState<{ officers: any[]; institutions: any[]; cities: any[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"officers" | "institutions" | "cities">("officers");

  useEffect(() => {
    importApi.referenceData().then(setData).catch(() => {});
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div>
          <div className="text-[14px] font-semibold text-gray-900">Vlerat e referencës</div>
          <div className="text-[12px] text-gray-400 mt-0.5">ID-të e zyrtarëve, emrat e institucioneve dhe qytetet</div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && data && (
        <div className="border-t border-gray-100">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-5">
            {([
              { key: "officers", label: `Zyrtarët (${data.officers.length})` },
              { key: "institutions", label: `Bankat (${data.institutions.length})` },
              { key: "cities", label: `Qytetet (${data.cities.length})` },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-3 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 max-h-80 overflow-y-auto">
            {tab === "officers" && (
              <div className="space-y-1">
                <p className="text-[11px] text-gray-400 mb-3">
                  Vendosni <span className="font-semibold text-gray-600">kodin numerik</span> të zyratarit në kolonën <span className="font-mono bg-gray-100 px-1 rounded">collection_officer</span> ose <span className="font-mono bg-gray-100 px-1 rounded">second_collection_officer</span> të dokumentit Excel.
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
                  Kopjoni <span className="font-semibold text-gray-600">kodin numerik</span> dhe vendoseni në kolonën <span className="font-mono bg-gray-100 px-1 rounded">institution_name</span> të dokumentit Excel.
                </p>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
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
              </div>
            )}

            {tab === "cities" && (
              <div>
                <p className="text-[11px] text-gray-400 mb-3">
                  Kopjoni <span className="font-semibold text-gray-600">kodin numerik</span> dhe vendoseni në kolonën <span className="font-mono bg-gray-100 px-1 rounded">city</span> të dokumentit Excel.
                </p>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
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
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ── Bulk update panel ──────────────────────────────────────────────────────────

type BulkType = "officer" | "secondary_officer" | "institution" | "city" | "category" | "balance" | "phone2";

const BULK_TYPE_OPTIONS: { key: BulkType; label: string; desc: string }[] = [
  { key: "officer",           label: "Zyrtar",           desc: "Ndrysho zyrtar kryesor" },
  { key: "secondary_officer", label: "Zyrtar i Dytë",    desc: "Ndrysho zyrtar dytësor" },
  { key: "institution",       label: "Institucioni",     desc: "Ndrysho bankën/institucionin" },
  { key: "city",              label: "Qyteti",           desc: "Ndrysho qytetin e huamarrësit" },
  { key: "category",          label: "Kategoria",        desc: "Ndrysho kategorinë (D1–D4, LEGAL)" },
  { key: "balance",           label: "Borgji",           desc: "Ndrysho borgjin aktual" },
  { key: "phone2",            label: "Tel. i Dytë",      desc: "Ndrysho numrin e dytë të telefonit" },
];

function BulkUpdatePanel({ officers, institutions, cities }: { officers: any[]; institutions: any[]; cities: any[] }) {
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
    if (type === "officer" || type === "secondary_officer") {
      return (
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
          {officers.map((o: any, idx: number) => (
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
    if (type === "institution") {
      return (
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
          {institutions.map((inst: any) => (
            <div key={inst.id} className="flex items-center px-3 py-1.5 hover:bg-gray-50 gap-2 text-[12px]">
              <span className="w-7 font-mono font-bold text-brand-700 text-center">{inst.code}</span>
              <span className="text-gray-800 flex-1">{inst.name}</span>
              <CopyBtn text={String(inst.code)} />
            </div>
          ))}
        </div>
      );
    }
    if (type === "category") {
      return (
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
          {[["D1","Faza 1"], ["D2","Faza 2"], ["D3","Faza 3"], ["D4","Faza 4"], ["LEGAL","Ligjore"]].map(([code, label]) => (
            <div key={code} className="flex items-center px-3 py-1.5 hover:bg-gray-50 gap-2 text-[12px]">
              <span className="w-12 font-mono font-bold text-brand-700">{code}</span>
              <span className="flex-1 text-gray-800">{label}</span>
              <CopyBtn text={code} />
            </div>
          ))}
        </div>
      );
    }
    if (type === "balance") {
      return <p className="text-[12px] text-gray-500 leading-relaxed">Vendosni shumën e borgjit aktual (numër decimal, p.sh. <span className="font-mono bg-gray-100 px-1 rounded">4500.00</span>) në kolonën e dytë të Excel.</p>;
    }
    if (type === "phone2") {
      return <p className="text-[12px] text-gray-500 leading-relaxed">Vendosni numrin e dytë të telefonit (p.sh. <span className="font-mono bg-gray-100 px-1 rounded">044123456</span>) në kolonën e dytë të Excel.</p>;
    }
    // city
    return (
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
        {cities.map((city: any) => (
          <div key={city.id} className="flex items-center px-3 py-1.5 hover:bg-gray-50 gap-2 text-[12px]">
            <span className="w-7 font-mono font-bold text-brand-700 text-center">{city.code}</span>
            <span className="text-gray-800 flex-1">{city.name}</span>
            <CopyBtn text={String(city.code)} />
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
          <div className="text-[12px] text-gray-400 mt-0.5">Ndrysho zyrtar, institucion, qytet, kategori, borgji ose telefon me ngarkesë Excel</div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-5">

          {/* Type selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:flex md:flex-wrap">
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

          {/* Template download + upload side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Left: download template */}
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Shkarko Template
              </p>
              <button
                onClick={() => {
                  const colB = type === "officer" ? "Kodi i Zyratarit" : type === "secondary_officer" ? "Kodi i Zyratarit Dytësor" : type === "institution" ? "Kodi i Institucionit" : type === "city" ? "Kodi i Qytetit" : type === "category" ? "Kategoria (D1/D2/D3/D4/LEGAL)" : type === "balance" ? "Borgji Aktual" : "Numri i Telefonit të Dytë";
                  const ex1 = type === "officer" || type === "secondary_officer" ? 3 : type === "institution" ? 4 : type === "city" ? 19 : type === "category" ? "D2" : type === "balance" ? 4500.00 : "044123456";
                  const ex2 = type === "officer" || type === "secondary_officer" ? 7 : type === "institution" ? 9 : type === "city" ? 5 : type === "category" ? "D3" : type === "balance" ? 1200.50 : "045654321";
                  const rows = [
                    { "Numri i Klientit (case_reference)": "Q71234567R", [colB]: ex1 },
                    { "Numri i Klientit (case_reference)": "M31234567N", [colB]: ex2 },
                    { "Numri i Klientit (case_reference)": "", [colB]: "" },
                  ];
                  downloadExcel(rows, `template-${type}`);
                }}
                className="w-full flex items-center gap-4 px-4 py-4 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 group-hover:border-brand-200 flex items-center justify-center shrink-0 transition-colors">
                  <FileSpreadsheet size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">
                    template-{type}.xlsx
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {type === "officer" ? "case_reference · kodi i zyratarit" : type === "secondary_officer" ? "case_reference · kodi i zyratarit dytësor" : type === "institution" ? "case_reference · kodi i institucionit" : type === "city" ? "case_reference · kodi i qytetit" : type === "category" ? "case_reference · kategoria (D1–D4/LEGAL)" : type === "balance" ? "case_reference · borgji aktual" : "case_reference · numri i telefonit të dytë"}
                  </div>
                </div>
                <Download size={14} className="text-gray-400 group-hover:text-brand-500 shrink-0 transition-colors" />
              </button>
              <p className="text-[11px] text-gray-400 mt-2.5 leading-relaxed">
                Hapeni në Excel, plotësoni të dhënat tuaja duke ndjekur shembujt, pastaj ngarkojeni.
              </p>
            </div>

            {/* Right: upload */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Ngarko Template të Plotësuar
              </p>

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
                      <p className="text-[11px] text-gray-400">Excel ose CSV</p>
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
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [officers, setOfficers]         = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [cities, setCities]             = useState<any[]>([]);

  useEffect(() => {
    importApi.jobs().then(setJobs).catch(() => {}).finally(() => setLoadingJobs(false));
    importApi.referenceData().then((d) => {
      setOfficers(d.officers);
      setInstitutions(d.institutions);
      setCities(d.cities);
    }).catch(() => {});
  }, []);

  function handleFile(f: File) { setFile(f); setResult(null); setError(""); }

  async function submit() {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const res = await importApi.upload(file);
      // Backend returns { jobId, status: 'PROCESSING' } — poll until complete
      if (res?.status === 'PROCESSING' && res?.jobId) {
        const poll = async () => {
          const jobs = await importApi.jobs();
          setJobs(jobs);
          const job = jobs.find((j: any) => j.id === res.jobId);
          if (!job || job.status === 'PROCESSING') {
            setTimeout(poll, 2000);
          } else {
            setResult({ jobId: job.id, fileName: job.fileName, total: job.totalRows, succeeded: job.successfulRows, failed: job.failedRows, skipped: job.totalRows - job.successfulRows - job.failedRows, errors: job.errors?.map((e: any) => ({ row: e.rowNumber, loan_number: '', error: e.errorMessage })) ?? [] });
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
    <div>
      <Topbar title="Import Portofoli" subtitle="Shtoni klientë të rinj nga dokumentet e bankave" />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Main card ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

          {/* Left: Template */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900 mb-1">Import Template</h2>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Shkarkoni template-in, hapeni në Excel, dhe kopjoni të dhënat nga dokumenti i bankës në kolonat përkatëse. Mund të lini bosh kolonat që banka nuk i ka.
              </p>
            </div>

            <a href={importApi.templateUrl()} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-medium transition-colors">
              <Download size={14} /> Shkarko Template Excel
            </a>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fushat e dokumentit</p>
              <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden text-[12px] max-h-56 overflow-y-auto">
                {[
                  { col: "full_name",                    req: true,  desc: "Emri i plotë i huamarrësit" },
                  { col: "loan_number",                  req: true,  desc: "Numri unik i kredisë (duhet të jetë unik)" },
                  { col: "institution_name",             req: true,  desc: "Kodi numerik i bankës (shih Vlerat e Referencës)" },
                  { col: "current_outstanding_balance",  req: true,  desc: "Borxhi aktual i mbetur — numër decimal (p.sh. 4500.00)" },
                  { col: "personal_id",                  req: false, desc: "Numri personal i huamarrësit (p.sh. 1234567890)" },
                  { col: "phone1",                       req: false, desc: "Numri kryesor i telefonit" },
                  { col: "phone2",                       req: false, desc: "Numri alternativ i telefonit" },
                  { col: "address",                      req: false, desc: "Adresa e plotë e banimit" },
                  { col: "city",                         req: false, desc: "Kodi numerik i qytetit (shih Vlerat e Referencës)" },
                  { col: "original_loan_amount",         req: false, desc: "Shuma origjinale e aprovuar e kredisë" },
                  { col: "disbursement_date",            req: false, desc: "Data e disbursimit — formati YYYY-MM-DD" },
                  { col: "last_payment_date",            req: false, desc: "Data e pagesës së fundit — formati YYYY-MM-DD" },
                  { col: "collection_officer",           req: false, desc: "Kodi numerik i zyratarit primar (shih Vlerat e Referencës)" },
                  { col: "second_collection_officer",    req: false, desc: "Kodi numerik i zyratarit sekondar (opsional)" },
                  { col: "guarantor_personal_id",        req: false, desc: "Numri personal i garantorit të parë" },
                  { col: "guarantor_phone",              req: false, desc: "Telefoni i garantorit të parë" },
                ].map(({ col, req, desc }) => (
                  <div key={col} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50">
                    <span className="font-mono text-[11px] text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{col}</span>
                    {req && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide shrink-0 mt-1">E detyrueshme</span>}
                    <span className="text-gray-500 leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">Kreditë që ekzistojnë tashmë anashkalohen automatikisht pa gabim.</p>
            </div>
          </div>

          {/* Right: Upload */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h2 className="text-[14px] font-semibold text-gray-900 mb-1">Ngarko dokumentin</h2>
            <p className="text-[12px] text-gray-500 mb-4">Ngarkoni template-in e plotësuar me të dhënat e klientëve.</p>

            {result ? (
              <ResultPanel result={result} onReset={reset} />
            ) : (
              <div className="flex flex-col flex-1 gap-3">
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
        <BulkUpdatePanel officers={officers} institutions={institutions} cities={cities} />

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
          ) : (() => {
            const LIMIT = 5;
            const visible = showAllJobs ? jobs : jobs.slice(0, LIMIT);
            return (
              <>
                <div className="space-y-2">
                  {visible.map(j => (
                    <HistoryRow
                      key={j.id}
                      job={j}
                      onRollback={() => importApi.jobs().then(setJobs).catch(() => {})}
                    />
                  ))}
                </div>
                {jobs.length > LIMIT && (
                  <button
                    onClick={() => setShowAllJobs(v => !v)}
                    className="mt-3 flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showAllJobs
                      ? <><ChevronUp size={13} /> Shfaq më pak</>
                      : <><ChevronDown size={13} /> Shfaq të gjitha ({jobs.length})</>}
                  </button>
                )}
              </>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
