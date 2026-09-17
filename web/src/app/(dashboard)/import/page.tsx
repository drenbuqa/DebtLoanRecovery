"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { importApi } from "@/lib/api";
import {
  Upload, Download, CheckCircle, XCircle, AlertTriangle,
  FileSpreadsheet, Clock, RotateCcw, ChevronDown, ChevronUp,
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
    FAILED:     { label: "Dështuar",       color: "bg-red-50 text-red-700",         dot: "bg-red-500" },
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

function HistoryRow({ job }: { job: any }) {
  const [open, setOpen] = useState(false);
  const hasErrors = job.errors?.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${hasErrors ? "cursor-pointer hover:bg-gray-50" : ""}`}
        onClick={() => hasErrors && setOpen(v => !v)}>
        <FileSpreadsheet size={15} className="text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-gray-900 truncate">{job.fileName}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {fmtDate(job.createdAt)} · {job.uploadedBy?.fullName ?? "—"}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-3 text-[12px]">
            <span className="text-emerald-600 font-semibold">{fmt(job.successfulRows)} ✓</span>
            {job.failedRows  > 0 && <span className="text-red-500 font-semibold">{fmt(job.failedRows)} ✗</span>}
            {job.skippedRows > 0 && <span className="text-gray-400">{fmt(job.skippedRows)} ~</span>}
          </div>
          <StatusBadge status={job.status} />
          {hasErrors && (open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />)}
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

  useEffect(() => {
    importApi.jobs().then(setJobs).catch(() => {}).finally(() => setLoadingJobs(false));
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
              {jobs.map(j => <HistoryRow key={j.id} job={j} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
