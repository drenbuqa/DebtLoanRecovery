"use client";

import { useEffect, useState, useCallback } from "react";
import Topbar from "@/components/layout/Topbar";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { activities as activitiesApi, cases as casesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";
import { MapPin, RefreshCw, CheckSquare, Search, X, LayoutGrid, List, Plus } from "lucide-react";
import { DatePresetPicker, DatePreset, presetToRange } from "@/components/ui/DatePresetPicker";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";

const OUTCOME_COLOR: Record<string, { dot: string; text: string; bg: string }> = {
  PROMISE_RECEIVED: { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  FULL_PAYMENT:     { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  PARTIAL_PAYMENT:  { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50" },
  CONTACTED:        { dot: "bg-gray-400",    text: "text-gray-600",    bg: "bg-gray-100" },
  NO_ANSWER:        { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50" },
  REFUSED:          { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50" },
  OTHER:            { dot: "bg-gray-300",    text: "text-gray-600",    bg: "bg-gray-50" },
};

const OUTCOME_LABEL: Record<string, string> = {
  PROMISE_RECEIVED: "Premtim i marrë",
  FULL_PAYMENT:     "Pagesë e plotë",
  PARTIAL_PAYMENT:  "Pagesë e pjesshme",
  CONTACTED:        "Kontaktuar",
  NO_ANSWER:        "Pa përgjigje",
  REFUSED:          "Refuzuar",
  OTHER:            "Tjetër",
};

function OutcomeBadge({ outcome }: { outcome?: string }) {
  if (!outcome) return <span className="text-gray-300 text-[12px]">—</span>;
  const c = OUTCOME_COLOR[outcome] ?? OUTCOME_COLOR.OTHER;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {OUTCOME_LABEL[outcome] ?? outcome}
    </span>
  );
}

const SORT_OPTIONS = [
  { value: "date_desc", label: "Më të rejat" },
  { value: "date_asc",  label: "Më të vjetrat" },
  { value: "promise",   label: "Sipas shumës së premtimit" },
];

const OUTCOME_OPTIONS = [
  { value: "PROMISE_RECEIVED", label: "Premtim i marrë" },
  { value: "FULL_PAYMENT",     label: "Pagesë e plotë" },
  { value: "PARTIAL_PAYMENT",  label: "Pagesë e pjesshme" },
  { value: "CONTACTED",        label: "Kontaktuar" },
  { value: "NO_ANSWER",        label: "Pa përgjigje" },
  { value: "REFUSED",          label: "Refuzuar" },
];

const LOG_OUTCOME_OPTIONS = [
  { value: "CONTACTED",        label: "Kontaktuar" },
  { value: "PROMISE_RECEIVED", label: "Premtim i marrë" },
  { value: "PARTIAL_PAYMENT",  label: "Pagesë e pjesshme" },
  { value: "FULL_PAYMENT",     label: "Pagesë e plotë" },
  { value: "NO_ANSWER",        label: "Pa përgjigje / nuk ishte në shtëpi" },
  { value: "REFUSED",          label: "Refuzoi të paguajë" },
  { value: "OTHER",            label: "Tjetër" },
];

export default function FieldVisitsPage() {
  const { user, scopedToSelf, scopedToOffice, can } = useAuth();
  const [refreshing, triggerRefresh] = useRefreshing();
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [view, setView] = useState<"cards" | "table">("cards");

  // Log Visit modal
  const [showLog, setShowLog] = useState(false);
  const [myCases, setMyCases] = useState<any[]>([]);
  const [logCaseId, setLogCaseId] = useState("");
  const [logOutcome, setLogOutcome] = useState("CONTACTED");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logPromise, setLogPromise] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError(null);
    try {
      const params: any = { activityType: "FIELD_VISIT", page: p, limit: 24 };
      if (scopedToSelf   && user?.id)       params.officerId = user.id;
      if (scopedToOffice && user?.officeId) params.officeId  = user.officeId;
      if (dateFrom) params.from = dateFrom;
      if (dateTo)   params.to   = dateTo;
      const res = await activitiesApi.listAll(params);
      setData(res.data); setMeta(res.meta); setPage(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [scopedToSelf, scopedToOffice, user?.id, user?.officeId, dateFrom, dateTo]);

  useEffect(() => { load(1); }, [dateFrom, dateTo, scopedToSelf, scopedToOffice, user?.id, user?.officeId]);

  async function openLogModal() {
    setShowLog(true); setLogError("");
    if (myCases.length === 0 && scopedToSelf && user?.id) {
      try {
        const res = await casesApi.list({ officerId: user.id, limit: 100 });
        setMyCases(res.data ?? []);
      } catch { /* non-fatal */ }
    }
  }

  function closeLog() {
    setShowLog(false); setLogCaseId(""); setLogOutcome("CONTACTED");
    setLogNotes(""); setLogDate(new Date().toISOString().split("T")[0]);
    setLogPromise(""); setLogError("");
  }

  async function submitLog() {
    if (!logCaseId) { setLogError("Ju lutem zgjidhni një dosje."); return; }
    setLogging(true); setLogError("");
    try {
      await activitiesApi.log(logCaseId, {
        officerId: user!.id,
        activityType: "FIELD_VISIT",
        outcome: logOutcome,
        notes: logNotes.trim() || undefined,
        occurredAt: logDate ? new Date(logDate).toISOString() : undefined,
        promiseAmount: logPromise ? Number(logPromise) : undefined,
        promiseDate: logOutcome === "PROMISE_RECEIVED" && logDate ? logDate : undefined,
      });
      closeLog();
      load(1);
      toast("Vizita në terren u regjistrua");
    } catch (e: any) { setLogError(e.message); }
    finally { setLogging(false); }
  }

  // Client-side filter + sort
  const filtered = data
    .filter((v) => {
      if (outcomeFilter && v.outcome !== outcomeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = v.case?.loan?.borrower
          ? `${v.case.loan.borrower.firstName} ${v.case.loan.borrower.lastName}`.toLowerCase()
          : "";
        const ref = (v.case?.caseReference ?? "").toLowerCase();
        const officer = (v.officer?.fullName ?? "").toLowerCase();
        if (!name.includes(q) && !ref.includes(q) && !officer.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "date_asc") return new Date(a.occurredAt ?? a.createdAt).getTime() - new Date(b.occurredAt ?? b.createdAt).getTime();
      if (sort === "promise") return (b.promiseAmount ?? 0) - (a.promiseAmount ?? 0);
      return new Date(b.occurredAt ?? b.createdAt).getTime() - new Date(a.occurredAt ?? a.createdAt).getTime();
    });

  const hasFilters = datePreset || search || outcomeFilter;

  return (
    <div className="flex flex-col">
      <Topbar title="Vizita në Terren" subtitle={scopedToSelf ? "Vizitat tuaja në terren" : "Vizitat në terren të regjistruara nga oficerët e arkëtimit"} />

      {/* Log Visit Modal */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in modal-panel">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Regjistro Vizitë në Terren</h2>
              <button onClick={closeLog} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {logError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{logError}</div>}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Dosje <span className="text-red-500">*</span>
                </label>
                <Select
                  value={logCaseId}
                  onChange={setLogCaseId}
                  options={myCases.map((c) => ({
                    value: c.id,
                    label: `${c.caseReference} — ${c.loan?.borrower ? `${c.loan.borrower.firstName} ${c.loan.borrower.lastName}` : "I panjohur"}`,
                  }))}
                  placeholder="Zgjidhni një dosje…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data e Vizitës</label>
                  <DatePicker value={logDate} onChange={setLogDate} placeholder="Sot" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Rezultati</label>
                  <Select value={logOutcome} onChange={setLogOutcome} options={LOG_OUTCOME_OPTIONS} />
                </div>
              </div>
              {logOutcome === "PROMISE_RECEIVED" && (
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shuma e Premtimit (€)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={logPromise} onChange={(e) => setLogPromise(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
              )}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shënime</label>
                <textarea
                  value={logNotes} onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Çfarë ndodhi gjatë vizitës?"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 resize-none"
                />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={closeLog} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
              <button onClick={submitLog} disabled={logging}
                className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {logging ? "Duke ruajtur…" : "Regjistro Vizitën"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">

        {/* Filter bar */}
        <div className="space-y-2">
          {/* Row 1: search + action button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={scopedToSelf ? "Kërko debitor ose dosje…" : "Kërko debitor, dosje…"}
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
            {can("field-visit:create") && (
              <button onClick={openLogModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors shrink-0">
                <Plus size={14} /> <span className="hidden sm:inline">Regjistro Vizitë</span>
              </button>
            )}
          </div>
          {/* Row 2: filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-36 md:w-40">
              <Select label="Rezultati" value={outcomeFilter} onChange={setOutcomeFilter} options={OUTCOME_OPTIONS} placeholder="Të gjitha" />
            </div>
            <DatePresetPicker label="Periudha" value={datePreset} onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); }} />
            {hasFilters && (
              <button onClick={() => { setDatePreset(""); setDateFrom(""); setDateTo(""); setSearch(""); setOutcomeFilter(""); }}
                className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
                <X size={12} /> Pastro
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {error} — <button onClick={() => load(1)} className="underline">Riprovo</button>
          </div>
        )}

        {!loading && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] text-gray-400">
              {filtered.length} vizitë{filtered.length !== 1 ? "" : ""}{hasFilters ? " që përputhen me filtrat" : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setView("cards")}
                  className={`p-1.5 rounded-md transition-colors ${view === "cards" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                  title="Pamja me karta"><LayoutGrid size={14} /></button>
                <button onClick={() => setView("table")}
                  className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                  title="Pamja si tabelë"><List size={14} /></button>
              </div>
              <button onClick={() => triggerRefresh(() => load(1))} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="h-3 w-3/4 bg-gray-100 rounded" />
                <div className="h-2.5 w-1/2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MapPin size={22} className="text-gray-400" />
            </div>
            <div className="text-center">
              <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën vizita në terren</div>
              <div className="text-[12px] text-gray-400">
                {hasFilters ? "Provoni të ndryshoni filtrat." : "Përdorni 'Regjistro Vizitë' për të regjistruar vizitën tuaj të parë."}
              </div>
            </div>
            {can("field-visit:create") && !hasFilters && (
              <button onClick={openLogModal}
                className="mt-1 px-4 py-2 text-[12px] font-medium text-brand-700 border border-brand-200 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors">
                Regjistro Vizitë
              </button>
            )}
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((v: any) => {
              const dateStr = v.occurredAt ?? v.createdAt;
              const hasPromise = v.promiseAmount > 0;
              return (
                <div key={v.id}
                  onClick={() => v.case?.id && (window.location.href = `/cases/${v.case.id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <MapPin size={14} className="text-gray-500" />
                    </div>
                    <OutcomeBadge outcome={v.outcome} />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mb-0.5">
                    {v.case?.loan?.borrower ? `${v.case.loan.borrower.firstName} ${v.case.loan.borrower.lastName}` : "—"}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mb-2">{v.case?.caseReference ?? "—"}</div>
                  {v.notes && (
                    <p className="text-[12px] text-gray-600 leading-snug mb-3 line-clamp-2">{v.notes}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-50 pt-2.5">
                    {!scopedToSelf && <span>{v.officer?.fullName ?? "—"}</span>}
                    {scopedToSelf && <span />}
                    <span className="tabular">{dateStr ? new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</span>
                  </div>
                  {hasPromise && (
                    <div className="mt-2 px-2.5 py-1.5 bg-emerald-50 rounded-lg flex items-center gap-1.5">
                      <CheckSquare size={11} className="text-emerald-500" />
                      <span className="text-[11px] text-emerald-700 font-medium">Premtim: €{Number(v.promiseAmount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <Thead>
                <tr>
                  <Th>Debitor</Th><Th>Dosje</Th>
                  {!scopedToSelf && <Th>Oficer</Th>}
                  <Th>Data</Th><Th>Rezultati</Th><Th>Premtimi</Th><Th>Shënime</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((v: any) => {
                  const dateStr = v.occurredAt ?? v.createdAt;
                  return (
                    <Tr key={v.id} onClick={() => v.case?.id && (window.location.href = `/cases/${v.case.id}`)}>
                      <Td>
                        <div className="font-medium text-gray-900">
                          {v.case?.loan?.borrower ? `${v.case.loan.borrower.firstName} ${v.case.loan.borrower.lastName}` : "—"}
                        </div>
                      </Td>
                      <Td><span className="font-mono text-[12px] text-brand-600">{v.case?.caseReference ?? "—"}</span></Td>
                      {!scopedToSelf && <Td><span className="text-[12px] text-gray-600">{v.officer?.fullName ?? "—"}</span></Td>}
                      <Td><span className="tabular text-[12px] text-gray-500">{dateStr ? new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></Td>
                      <Td><OutcomeBadge outcome={v.outcome} /></Td>
                      <Td>
                        {v.promiseAmount > 0
                          ? <span className="text-[12px] font-semibold text-emerald-700 tabular">€{Number(v.promiseAmount).toLocaleString()}</span>
                          : <span className="text-gray-300">—</span>}
                      </Td>
                      <Td><span className="text-[12px] text-gray-500 line-clamp-1">{v.notes ?? "—"}</span></Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
            {meta && meta.pages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-[12px] text-gray-500">
                <span>{((page - 1) * 24) + 1}–{Math.min(page * 24, meta.total)} nga {meta.total}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">Mëparshme</button>
                  <button disabled={page >= meta.pages} onClick={() => load(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">Tjetër</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
