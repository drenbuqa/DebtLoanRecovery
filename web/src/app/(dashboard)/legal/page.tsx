"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import Topbar from "@/components/layout/Topbar";
import { useFormErrors } from "@/lib/form";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";
import { legal as legalApi, cases as casesApi, documents as docsApi } from "@/lib/api";
import { RefreshCw, Scale, Plus, X, Search, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useRefreshing } from "@/lib/useRefreshing";
import { DatePresetPicker, DatePreset, presetToRange } from "@/components/ui/DatePresetPicker";
import { MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import { useIsMobile } from "@/lib/useIsMobile";
import { formatEnum } from "@/lib/utils";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";

const STATUS_LABELS: Record<string, string> = {
  INITIATED:   "Iniciuar",
  IN_PROGRESS: "Në Progres",
  JUDGMENT:    "Vendim",
  ENFORCEMENT: "Ekzekutim",
  CLOSED:      "Mbyllur",
};

const STATUS_DOT: Record<string, string> = {
  INITIATED:   "bg-gray-300",
  IN_PROGRESS: "bg-amber-400",
  JUDGMENT:    "bg-red-400",
  ENFORCEMENT: "bg-amber-500",
  CLOSED:      "bg-gray-300",
};

function LF({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500 font-bold">*</span> : <span className="text-gray-300 font-normal normal-case tracking-normal text-[10px]">(opsionale)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">↑ {error}</p>}
    </div>
  );
}

function NewProceedingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [caseSearch, setCaseSearch] = useState("");
  const [caseResults, setCaseResults] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseAttempted, setCaseAttempted] = useState(false);
  const [court, setCourt] = useState("");
  const [legalCaseNumber, setLegalCaseNumber] = useState("");
  const [filingDate, setFilingDate] = useState("");
  const [initiationDate, setInitiationDate] = useState("");
  const [nextHearing, setNextHearing] = useState("");
  const [notes, setNotes] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { touch, touchAll, fieldError } = useFormErrors();

  async function searchCases(q: string) {
    setCaseSearch(q);
    if (q.length < 2) { setCaseResults([]); return; }
    try {
      const res = await casesApi.list({ search: q, limit: 6 });
      setCaseResults(res.data);
    } catch {}
  }

  const filingDateError = fieldError("filingDate", filingDate, { required: true });
  const caseError = caseAttempted && !selectedCase ? "Ju lutem zgjidhni një dosje" : null;

  async function submit() {
    setCaseAttempted(true);
    touchAll(["filingDate"]);
    if (!selectedCase || filingDateError) return;

    setSaving(true); setSubmitError("");
    try {
      const lp: any = await legalApi.create({
        caseId: selectedCase.id,
        court: court.trim() || undefined,
        legalCaseNumber: legalCaseNumber.trim() || undefined,
        filingDate,
        initiationDate: initiationDate || undefined,
        nextHearingDate: nextHearing || undefined,
        notes: notes.trim() || undefined,
      });
      if (docFile && lp?.caseId) {
        try { await docsApi.upload(lp.caseId, docFile, "LEGAL"); } catch {}
      }
      onCreated();
    } catch (e: any) {
      setSubmitError(e.message);
      setSaving(false);
    }
  }

  const inp = (hasErr: boolean) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${hasErr ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-modal-in modal-panel max-h-[90vh] flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Procedim i Ri Gjyqësor</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Inicioni një procedim gjyqësor ndaj një debitori</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
          {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{submitError}</div>}

          {/* Case search */}
          <LF label="Dosje" required error={caseError}>
            {selectedCase ? (
              <div className="flex items-center justify-between px-3 py-2.5 border border-brand-300 bg-brand-50 rounded-xl">
                <div>
                  <span className="text-[12px] font-semibold text-brand-700 font-mono">{selectedCase.caseReference}</span>
                  <span className="text-[12px] text-gray-600 ml-2">
                    {selectedCase.loan?.borrower ? `${selectedCase.loan.borrower.firstName} ${selectedCase.loan.borrower.lastName}` : ""}
                  </span>
                </div>
                <button onClick={() => { setSelectedCase(null); setCaseSearch(""); setCaseResults([]); }}
                  className="text-brand-400 hover:text-brand-600"><X size={13} /></button>
              </div>
            ) : (
              <div className="relative">
                <input value={caseSearch} onChange={(e) => searchCases(e.target.value)}
                  placeholder="Kërko sipas referencës së dosjes ose emrit të debitorit…"
                  className={inp(!!caseError)} />
                {caseResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {caseResults.map((c) => (
                      <button key={c.id} onClick={() => { setSelectedCase(c); setCaseSearch(""); setCaseResults([]); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <span className="text-[11px] font-mono font-semibold text-brand-600">{c.caseReference}</span>
                        <span className="text-[12px] text-gray-700">
                          {c.loan?.borrower ? `${c.loan.borrower.firstName} ${c.loan.borrower.lastName}` : "—"}
                        </span>
                        <span className="ml-auto text-[11px] text-gray-400">{c.loan?.institution?.shortName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </LF>

          <div className="grid grid-cols-2 gap-3">
            <LF label="Numri i Lëndës">
              <input value={legalCaseNumber} onChange={(e) => setLegalCaseNumber(e.target.value)}
                placeholder="p.sh. C.nr.123/2026" className={inp(false)} />
            </LF>
            <LF label="Gjykata / Juridiksioni">
              <input value={court} onChange={(e) => setCourt(e.target.value)}
                placeholder="p.sh. Gjykata Themelore e Prishtinës" className={inp(false)} />
            </LF>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LF label="Data e Inicimit">
              <DatePicker value={initiationDate} onChange={setInitiationDate} placeholder="Zgjidhni datën" />
            </LF>
            <LF label="Data e Depozitimit" required error={filingDateError}>
              <DatePicker value={filingDate} onChange={(v) => { setFilingDate(v); touch("filingDate"); }} placeholder="Zgjidhni datën" />
            </LF>
          </div>

          <LF label="Seanca Tjetër">
            <DatePicker value={nextHearing} onChange={setNextHearing} placeholder="Zgjidhni datën" />
          </LF>

          <LF label="Shënime">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Shënime mbi dosjen, të dhëna të avokatit, shuma e kërkesës…"
              className={`${inp(false)} resize-none`} />
          </LF>

          <LF label="Ngarko Dokument (PDF / Word)">
            <input ref={fileRef} type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              className="w-full text-[13px] text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
            {docFile && <p className="mt-1 text-[11px] text-gray-400">{docFile.name} · {(docFile.size / 1024).toFixed(0)} KB</p>}
          </LF>
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {saving ? "Duke krijuar…" : "Krijo Procedimin"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LegalPage() {
  const isMobile = useIsMobile();
  const { can, user, scopedToSelf, scopedToOffice } = useAuth();
  const { toast } = useToast();
  const [refreshing, triggerRefresh] = useRefreshing();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showNew, setShowNew] = useState(false);

  const [editLp, setEditLp] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNextHearing, setEditNextHearing] = useState("");
  const [editJudgmentDate, setEditJudgmentDate] = useState("");
  const [editJudgmentAmount, setEditJudgmentAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function openEdit(lp: any) {
    setEditLp(lp);
    setEditStatus(lp.status ?? "");
    setEditNextHearing(lp.nextHearingDate ? lp.nextHearingDate.slice(0, 10) : "");
    setEditJudgmentDate(lp.judgmentDate ? lp.judgmentDate.slice(0, 10) : "");
    setEditJudgmentAmount(lp.judgmentAmount != null ? String(lp.judgmentAmount) : "");
    setEditNotes(lp.notes ?? "");
    setEditError("");
  }

  async function saveEdit() {
    setEditSaving(true); setEditError("");
    try {
      await legalApi.update(editLp.id, {
        status: editStatus || undefined,
        nextHearingDate: editNextHearing || undefined,
        judgmentDate: editJudgmentDate || undefined,
        judgmentAmount: editJudgmentAmount !== "" ? parseFloat(editJudgmentAmount) : undefined,
        notes: editNotes || undefined,
      });
      setEditLp(null);
      load(page);
      toast("Procedimi u përditësua");
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  }

  async function load(p = 1, status = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: p, limit: 100, ...(status ? { status } : {}), ...(scopedToOffice && user?.officeId ? { officeId: user.officeId } : {}), ...(scopedToSelf && user?.id ? { officerId: user.id } : {}) };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res = await legalApi.list(params);
      setData(res.data);
      setMeta(res.meta);
      setStats(res.stats ?? {});
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [scopedToOffice, scopedToSelf, user?.officeId, user?.id]);

  const filterOptions = [
    { key: "", label: "Të gjitha" },
    ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label })),
  ];

  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? data.filter((lp) => {
    const borrower = lp.case?.loan?.borrower;
    const name = borrower ? `${borrower.firstName} ${borrower.lastName}`.toLowerCase() : "";
    const ref = (lp.case?.caseReference ?? "").toLowerCase();
    const court = (lp.court ?? "").toLowerCase();
    return name.includes(q) || ref.includes(q) || court.includes(q);
  }) : data;

  return (
    <div className="flex flex-col">
      {showNew && (
        <NewProceedingModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(1); toast("Procedimi gjyqësor u krijua"); }}
        />
      )}
      <Topbar title="Procedime Gjyqësore" subtitle={scopedToSelf ? "Dosjet tuaja në procedim gjyqësor" : "Procedime aktive dhe të mbyllura"} />

      <div className="p-4 md:p-6 space-y-5">

        {/* Filter bar */}
        {isMobile ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kërko debitor ose dosje…"
                  className="w-full pl-9 pr-3 py-2.5 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-400" />
              </div>
              {can("legal:create") && (
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1 px-3.5 py-2.5 bg-brand-600 text-white rounded-xl text-[13px] font-medium shrink-0">
                  <Plus size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              <MobileFilterSheet groups={[
                {
                  key: "statusFilter",
                  label: "Statusi",
                  value: statusFilter,
                  onChange: (v) => { setStatusFilter(v); load(1, v); },
                  allLabel: "Të gjitha",
                  options: filterOptions.filter((o) => o.key !== "").map((o) => ({ value: o.key, label: o.label })),
                },
                {
                  key: "datePreset",
                  label: "Periudha",
                  value: datePreset,
                  onChange: (v) => { const p = v as DatePreset; setDatePreset(p); const r = p ? presetToRange(p) : { from: "", to: "" }; setDateFrom(r.from); setDateTo(r.to); load(1); },
                  allLabel: "Të gjitha datat",
                  options: [
                    { value: "today",      label: "Sot" },
                    { value: "yesterday",  label: "Dje" },
                    { value: "this_week",  label: "Kjo Javë" },
                    { value: "last_week",  label: "Java e Kaluar" },
                    { value: "this_month", label: "Ky Muaj" },
                    { value: "last_month", label: "Muaji i Kaluar" },
                  ],
                },
              ]} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kërko debitor ose dosje…"
                  className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400" />
              </div>
              <DatePresetPicker label="Periudha" value={datePreset} onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); load(1); }} />
              {can("legal:create") && (
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors ml-auto shrink-0">
                  <Plus size={14} /> Procedim i Ri
                </button>
              )}
            </div>
            <div className="flex border-b border-gray-200">
              {filterOptions.map(({ key, label }) => (
                <button key={key}
                  onClick={() => { setStatusFilter(key); load(1, key); }}
                  className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    statusFilter === key
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-gray-900">Regjistri i Çështjeve Gjyqësore</h3>
              {meta && <p className="text-[12px] text-gray-400">{meta.total} procedime</p>}
            </div>
            <button onClick={() => triggerRefresh(() => load(page))} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {error} — <button onClick={() => load()} className="underline">Riprovo</button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
              <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Scale size={22} className="text-gray-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk ka procedime gjyqësore</div>
                <div className="text-[12px] text-gray-400 max-w-xs">Dosjet e eskaluara në veprim gjyqësor do të shfaqen këtu.</div>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <Thead>
                  <tr>
                    <Th>Ref. Dosjes</Th>
                    <Th>Debitor</Th>
                    <Th>Institucioni</Th>
                    <Th>Gjykata</Th>
                    <Th>Data e Depozitimit</Th>
                    <Th>Seanca Tjetër</Th>
                    <Th>Vendimi</Th>
                    <Th>Statusi</Th>
                    {!scopedToSelf && <Th>Oficer</Th>}
                  </tr>
                </Thead>
                <Tbody>
                  {filtered.map((lp) => {
                    const statusLabel = STATUS_LABELS[lp.status] ?? formatEnum(lp.status);
                    const dotCls = STATUS_DOT[lp.status] ?? "bg-gray-300";
                    return (
                      <Tr key={lp.id} className="group" onClick={() => window.location.href = `/cases/${lp.case?.id}?tab=Legal`}>
                        <Td>
                          <span className="font-mono text-[12px] text-brand-600">{lp.case?.caseReference ?? "—"}</span>
                          {lp.legalCaseNumber && <div className="text-[11px] text-gray-400 mt-0.5">{lp.legalCaseNumber}</div>}
                        </Td>
                        <Td>
                          <span className="font-medium text-gray-900">
                            {lp.case?.loan?.borrower
                              ? `${lp.case.loan.borrower.firstName} ${lp.case.loan.borrower.lastName}`
                              : "—"}
                          </span>
                          {lp.case?.loan?.borrower?.personalId && (
                            <div className="text-[11px] text-gray-400 tabular">{lp.case.loan.borrower.personalId}</div>
                          )}
                          {lp.notes && (
                            <div className="text-[11px] text-gray-400 italic mt-0.5 line-clamp-1">{lp.notes}</div>
                          )}
                        </Td>
                        <Td><span className="text-gray-500">{lp.case?.loan?.institution?.shortName ?? "—"}</span></Td>
                        <Td><span className="text-gray-500 text-[12px]">{lp.court ?? "—"}</span></Td>
                        <Td>
                          <span className="tabular text-gray-500 text-[12px]">
                            {lp.filingDate ? new Date(lp.filingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                          </span>
                        </Td>
                        <Td>
                          <span className="tabular text-gray-500 text-[12px]">
                            {lp.nextHearingDate ? new Date(lp.nextHearingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                          </span>
                        </Td>
                        <Td>
                          {lp.judgmentAmount != null
                            ? <span className="font-semibold text-gray-800 tabular">{formatCurrency(Number(lp.judgmentAmount))}</span>
                            : <span className="text-gray-300">—</span>}
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                            {statusLabel}
                          </span>
                        </Td>
                        {!scopedToSelf && <Td><span className="text-gray-500 text-[12px]">{lp.case?.assignedOfficer?.fullName ?? "—"}</span></Td>}
                        <Td>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(lp); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                            <Pencil size={13} />
                          </button>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>

              {meta && meta.pages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[12px] text-gray-400">{((meta.page - 1) * 25) + 1}–{Math.min(meta.page * 25, meta.total)} nga {meta.total.toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <button disabled={meta.page <= 1} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); load(meta.page - 1); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-[12px] text-gray-500 tabular-nums min-w-[60px] text-center">{meta.page} / {meta.pages}</span>
                    <button disabled={meta.page >= meta.pages} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); load(meta.page + 1); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

      </div>

      {/* ── Edit Legal Proceeding modal ── */}
      {editLp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in modal-panel">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">Ndrysho Procedimin</h2>
                <p className="text-[12px] text-gray-400 mt-0.5">{editLp.case?.caseReference} · {editLp.case?.loan?.borrower ? `${editLp.case.loan.borrower.firstName} ${editLp.case.loan.borrower.lastName}` : ""}</p>
              </div>
              <button onClick={() => setEditLp(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{editError}</div>}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Statusi</label>
                <Select value={editStatus} onChange={setEditStatus} placeholder="Pa ndryshim"
                  options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data e Seancës Tjetër</label>
                  <DatePicker value={editNextHearing} onChange={setEditNextHearing} placeholder="Zgjidhni datën" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data e Vendimit</label>
                  <DatePicker value={editJudgmentDate} onChange={setEditJudgmentDate} placeholder="Zgjidhni datën" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shuma e Vendimit (EUR)</label>
                <input type="number" min="0" step="0.01" value={editJudgmentAmount}
                  onChange={(e) => setEditJudgmentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shënime</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                  placeholder="Shënime shtesë…"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setEditLp(null)} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
              <button onClick={saveEdit} disabled={editSaving}
                className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {editSaving ? "Duke ruajtur…" : "Ruaj Ndryshimet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
