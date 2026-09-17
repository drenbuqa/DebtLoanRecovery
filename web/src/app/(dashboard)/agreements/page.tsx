"use client";

import React, { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency, formatEnum } from "@/lib/utils";
import { agreements as agreementsApi, cases as casesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";
import { RefreshCw, FileText, Search, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import { useIsMobile } from "@/lib/useIsMobile";
import { DatePresetPicker, DatePreset, presetToRange } from "@/components/ui/DatePresetPicker";
import { DatePicker } from "@/components/ui/DatePicker";
import { useFormErrors } from "@/lib/form";
import { useToast } from "@/components/ui/Toast";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:    "Aktive",
  COMPLETED: "E Përfunduar",
  DEFAULTED: "E Dështuar",
  BROKEN:    "E Thyer",
  CANCELLED: "E Anuluar",
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE:    "bg-emerald-400",
  COMPLETED: "bg-gray-300",
  DEFAULTED: "bg-orange-400",
  BROKEN:    "bg-red-400",
  CANCELLED: "bg-gray-200",
};

function AF({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
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

function NewAgreementModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [caseSearch, setCaseSearch] = useState("");
  const [caseResults, setCaseResults] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseAttempted, setCaseAttempted] = useState(false);
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
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

  const amountError  = fieldError("totalAmount",      totalAmount,      { required: true, custom: (v) => isNaN(parseFloat(v)) || parseFloat(v) <= 0 ? "Shuma duhet të jetë pozitive" : null });
  const countError   = fieldError("installmentCount", installmentCount, { required: true, custom: (v) => { const n = parseInt(v); return (isNaN(n) || n < 1 || n > 120) ? "Ndërmjet 1 dhe 120" : null; } });
  const startError   = fieldError("startDate",        startDate,        { required: true });
  const caseError    = caseAttempted && !selectedCase ? "Ju lutem zgjidhni një dosje" : null;

  const inp = (hasErr: boolean) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${hasErr ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`;

  async function submit() {
    setCaseAttempted(true);
    touchAll(["totalAmount", "installmentCount", "startDate"]);
    if (!selectedCase || amountError || countError || startError) return;
    setSaving(true); setSubmitError("");
    try {
      await agreementsApi.create({
        caseId: selectedCase.id,
        totalAmount: parseFloat(totalAmount),
        installmentCount: parseInt(installmentCount),
        startDate,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (e: any) {
      setSubmitError(e.message);
      setSaving(false);
    }
  }

  const monthlyAmount = totalAmount && installmentCount && !isNaN(parseFloat(totalAmount)) && parseInt(installmentCount) > 0
    ? parseFloat(totalAmount) / parseInt(installmentCount)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-modal-in modal-panel">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Marrëveshje e Re Ripagimi</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Krijoni një plan këstesh me debitorin</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{submitError}</div>}

          {/* Case search */}
          <AF label="Dosje" required error={caseError}>
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
                  placeholder="Kërko sipas referencës ose emrit të debitorit…"
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
          </AF>

          <div className="grid grid-cols-2 gap-3">
            <AF label="Shuma Totale (€)" required error={amountError}>
              <input value={totalAmount} onChange={(e) => { setTotalAmount(e.target.value); touch("totalAmount"); }}
                onBlur={() => touch("totalAmount")}
                placeholder="p.sh. 5000" type="number" min="0" step="0.01"
                className={inp(!!amountError)} />
            </AF>
            <AF label="Numri i Kësteve" required error={countError}>
              <input value={installmentCount} onChange={(e) => { setInstallmentCount(e.target.value); touch("installmentCount"); }}
                onBlur={() => touch("installmentCount")}
                placeholder="p.sh. 12" type="number" min="1" max="120"
                className={inp(!!countError)} />
            </AF>
          </div>

          {monthlyAmount !== null && (
            <div className="px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg text-[12px] text-brand-700">
              Këst mujor: <span className="font-semibold">{formatCurrency(monthlyAmount)}</span>
            </div>
          )}

          <AF label="Data e Këstit të Parë" required error={startError}>
            <DatePicker value={startDate} onChange={(v) => { setStartDate(v); touch("startDate"); }} placeholder="Zgjidhni datën" />
          </AF>

          <AF label="Shënime">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Kushte të veçanta, shënime mbi marrëveshjen…"
              className={`${inp(false)} resize-none`} />
          </AF>
        </div>

        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {saving ? "Duke krijuar…" : "Krijo Marrëveshjen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function nextDueInstallment(installments: any[]) {
  if (!installments?.length) return null;
  const pending = installments.filter((i) => i.status !== "PAID" && i.status !== "WAIVED");
  if (!pending.length) return null;
  return pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
}

export default function AgreementsPage() {
  const isMobile = useIsMobile();
  const { user, scopedToSelf, scopedToOffice, can } = useAuth();
  const { toast } = useToast();
  const [refreshing, triggerRefresh] = useRefreshing();
  const [showNew, setShowNew] = useState(false);
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

  async function load(p = 1, status = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page: p, limit: 100, ...(status ? { status } : {}) };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      if (scopedToSelf   && user?.id)       params.officerId = user.id;
      if (scopedToOffice && user?.officeId) params.officeId  = user.officeId;
      const res = await agreementsApi.list(params);
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

  useEffect(() => { load(); }, [scopedToSelf, user?.id]);

  const filterOptions = [
    { key: "", label: "Të gjitha" },
    ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label })),
  ];

  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? data.filter((a) => {
    const borrower = a.case?.loan?.borrower;
    const name = borrower ? `${borrower.firstName} ${borrower.lastName}`.toLowerCase() : "";
    const ref = (a.case?.caseReference ?? "").toLowerCase();
    return name.includes(q) || ref.includes(q);
  }) : data;

  return (
    <div className="flex flex-col">
      {showNew && <NewAgreementModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(1); toast("Marrëveshja u krijua"); }} />}
      <Topbar title="Marrëveshjet" subtitle={scopedToSelf ? "Marrëveshjet tuaja aktive të ripagimit" : "Marrëveshjet e ripagimit dhe oraret e kësteve"} />

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
              {can("agreement:create") && (
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-brand-600 text-white rounded-xl text-[12px] font-medium shrink-0 whitespace-nowrap">
                  <Plus size={13} /> Regjistro
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kërko debitor ose dosje…"
                  className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400" />
              </div>
              <DatePresetPicker label="Periudha" value={datePreset} onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); load(1); }} />
              {can("agreement:create") && (
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors ml-auto shrink-0">
                  <Plus size={14} /> Marrëveshje e Re
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
            <h3 className="text-[13px] font-semibold text-gray-900">Regjistri i Marrëveshjeve</h3>
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
                <FileText size={22} className="text-gray-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën marrëveshje</div>
                <div className="text-[12px] text-gray-400 max-w-xs">Marrëveshjet e ripagimit të krijuara për dosjet do të shfaqen këtu.</div>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <Thead>
                  <tr>
                    <Th>Referenca</Th>
                    <Th>Debitori</Th>
                    <Th>Dosja</Th>
                    <Th>Shuma Totale</Th>
                    <Th>Këste</Th>
                    <Th>Kësti i Ardhshëm</Th>
                    <Th>Data e Mbarimit</Th>
                    <Th>Statusi</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {filtered.map((a) => {
                    const paid = a.installments?.filter((i: any) => i.status === "PAID").length ?? 0;
                    const total = a.installments?.length ?? a.installmentCount;
                    const dotCls = STATUS_DOT[a.status] ?? "bg-gray-300";
                    const statusLabel = STATUS_LABELS[a.status] ?? formatEnum(a.status);
                    const nextInst = nextDueInstallment(a.installments);
                    const nextDueDate = nextInst ? new Date(nextInst.dueDate) : null;
                    const nextIsOverdue = nextDueDate && nextDueDate < new Date();
                    return (
                      <Tr key={a.id} onClick={() => window.location.href = `/cases/${a.case?.id}?tab=Marrëveshjet`}>
                        <Td><span className="font-mono text-[12px] text-gray-500">{a.agreementReference}</span></Td>
                        <Td>
                          <span className="font-medium text-gray-900">
                            {a.case?.loan?.borrower
                              ? `${a.case.loan.borrower.firstName} ${a.case.loan.borrower.lastName}`
                              : "—"}
                          </span>
                          {a.notes && (
                            <div className="text-[11px] text-gray-400 italic mt-0.5 line-clamp-1">{a.notes}</div>
                          )}
                        </Td>
                        <Td><span className="font-mono text-[12px] text-gray-500">{a.case?.caseReference ?? "—"}</span></Td>
                        <Td><span className="font-semibold tabular text-gray-900">{formatCurrency(Number(a.totalAmount))}</span></Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="tabular text-gray-600 text-[12px]">{paid}/{total}</span>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-16">
                              <div className="h-full bg-gray-400 rounded-full" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </Td>
                        <Td>
                          {nextDueDate ? (
                            <div>
                              <span className={`tabular text-[12px] font-medium ${nextIsOverdue ? "text-red-600" : "text-gray-700"}`}>
                                {nextDueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                              </span>
                              {nextIsOverdue && <div className="text-[10px] text-red-500">Me Vonesë</div>}
                              {nextInst?.amount && <div className="text-[10px] text-gray-400 tabular">{formatCurrency(Number(nextInst.amount))}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[12px]">—</span>
                          )}
                        </Td>
                        <Td>
                          <span className="tabular text-gray-500 text-[12px]">
                            {a.endDate ? new Date(a.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                          </span>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                            {statusLabel}
                          </span>
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
                    <button disabled={meta.page <= 1} onClick={() => { document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" }); load(meta.page - 1); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-[12px] text-gray-500 tabular-nums min-w-[60px] text-center">{meta.page} / {meta.pages}</span>
                    <button disabled={meta.page >= meta.pages} onClick={() => { document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" }); load(meta.page + 1); }}
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
    </div>
  );
}
