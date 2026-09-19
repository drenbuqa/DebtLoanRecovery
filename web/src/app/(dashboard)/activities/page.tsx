"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { activities as activitiesApi, cases as casesApi, users as usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { DatePresetPicker, DatePreset, presetToRange } from "@/components/ui/DatePresetPicker";
import { DatePicker } from "@/components/ui/DatePicker";
import { useIsMobile } from "@/lib/useIsMobile";
import { MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import {
  RefreshCw, Phone, MapPin, CreditCard, FileText,
  CheckSquare, Clock, Mail, MessageSquare, ChevronLeft, ChevronRight,
  Activity, Search, X, Plus, AlertTriangle,
} from "lucide-react";

// ── Activity type metadata ────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  CALL:             { icon: Phone,         label: "Telefonatë",           color: "text-gray-500",    bg: "bg-gray-100" },
  CALL_BORROWER:    { icon: Phone,         label: "Tel. Huamarrës",       color: "text-gray-500",    bg: "bg-gray-100" },
  CALL_GUARANTOR:   { icon: Phone,         label: "Tel. Garantori",       color: "text-gray-500",    bg: "bg-gray-100" },
  VISIT:            { icon: MapPin,        label: "Vizitë",               color: "text-gray-500",    bg: "bg-gray-100" },
  VISIT_BORROWER:   { icon: MapPin,        label: "Vizitë Huamarrës",     color: "text-gray-500",    bg: "bg-gray-100" },
  VISIT_GUARANTOR:  { icon: MapPin,        label: "Vizitë Garantori",     color: "text-gray-500",    bg: "bg-gray-100" },
  FIELD_VISIT:      { icon: MapPin,        label: "Vizitë në Terren",     color: "text-brand-600",   bg: "bg-brand-50" },
  SMS:              { icon: MessageSquare, label: "SMS",                  color: "text-gray-500",    bg: "bg-gray-100" },
  EMAIL:            { icon: Mail,          label: "Email",                color: "text-gray-500",    bg: "bg-gray-100" },
  LETTER:           { icon: FileText,      label: "Letër",                color: "text-gray-500",    bg: "bg-gray-100" },
  WARNING_LETTER:   { icon: AlertTriangle, label: "Letër Paralajmëruese", color: "text-amber-600",   bg: "bg-amber-50" },
  PROMISE_TO_PAY:   { icon: CheckSquare,   label: "Premtim Pagese",       color: "text-amber-600",   bg: "bg-amber-50" },
  PAYMENT_RECEIVED: { icon: CreditCard,    label: "Pagesë e Marrë",       color: "text-emerald-600", bg: "bg-emerald-50" },
  LEGAL_ACTION:     { icon: FileText,      label: "Veprim Ligjor",        color: "text-brand-600",   bg: "bg-brand-50" },
  MEETING_BORROWER:  { icon: Activity,      label: "Takim Huamarrës",      color: "text-gray-500",    bg: "bg-gray-100" },
  MEETING_GUARANTOR: { icon: Activity,      label: "Takim Garantori",      color: "text-gray-500",    bg: "bg-gray-100" },
  NOTE:             { icon: Clock,         label: "Shënim",               color: "text-gray-500",    bg: "bg-gray-100" },
};

const OUTCOME_META: Record<string, { label: string; color: string; bg: string }> = {
  CONTACTED:        { label: "Kontaktuar",             color: "text-gray-600",    bg: "bg-gray-100" },
  NO_ANSWER:        { label: "Nuk u përgjigj",         color: "text-gray-500",    bg: "bg-gray-100" },
  PROMISE_RECEIVED: { label: "Premtim i marrë",        color: "text-amber-700",   bg: "bg-amber-50" },
  FULL_PAYMENT:     { label: "Pagesë e plotë",         color: "text-emerald-700", bg: "bg-emerald-50" },
  PARTIAL_PAYMENT:  { label: "Pagesë e pjesshme",      color: "text-emerald-600", bg: "bg-emerald-50" },
  REFUSED:          { label: "Refuzuar",               color: "text-red-700",     bg: "bg-red-50" },
  DISPUTE:          { label: "Kundërshtim Borxhi",     color: "text-orange-700",  bg: "bg-orange-50" },
  DECEASED:         { label: "I/E Ndjerë",             color: "text-gray-600",    bg: "bg-gray-200" },
  ESCALATED:        { label: "Eskaluar",               color: "text-brand-700",   bg: "bg-brand-50" },
  OTHER:            { label: "Tjetër",                 color: "text-gray-500",    bg: "bg-gray-100" },
};

const ACTIVITY_FILTER_GROUPS = [
  { key: "",                                                                       label: "Të gjitha" },
  { key: "CALL_BORROWER,CALL_GUARANTOR,PROMISE_TO_PAY",                            label: "Telefonata" },
  { key: "VISIT,VISIT_BORROWER,VISIT_GUARANTOR,FIELD_VISIT,MEETING_BORROWER,MEETING_GUARANTOR", label: "Vizita & Takime" },
  { key: "SMS,EMAIL,LETTER,WARNING_LETTER",                                        label: "Komunikim" },
  { key: "PROMISE_TO_PAY",                                                         label: "Premtime" },
  { key: "PAYMENT_RECEIVED",                                                       label: "Pagesa" },
  { key: "LEGAL_ACTION",                                                           label: "Ligjore" },
  { key: "NOTE",                                                                   label: "Shënime" },
];

const ACT_TYPE_OPTIONS = [
  { value: "CALL_BORROWER",    label: "Telefono Huamarresin" },
  { value: "CALL_GUARANTOR",   label: "Telefono Garantorin" },
  { value: "VISIT_BORROWER",   label: "Vizito Huamarresin" },
  { value: "VISIT_GUARANTOR",  label: "Vizito Garantorin" },
  { value: "SMS",              label: "Dërgo SMS" },
  { value: "WARNING_LETTER",   label: "Dërgo Letërvërejtje" },
  { value: "MEETING_BORROWER", label: "Takim me Huamarresin" },
  { value: "MEETING_GUARANTOR",label: "Takim me Garantorin" },
  { value: "PROMISE_TO_PAY",   label: "Zotim për Pagesë" },
  { value: "NOTE",             label: "Aktivitete Tjera / Shënim" },
];

const CASE_CATEGORY_OPTIONS = [
  { value: "no_contact_yet",    label: "Nuk kemi arritur të merremi me rastin" },
  { value: "unreachable",       label: "I Pakontaktuar / Pagjetur" },
  { value: "no_agreement",      label: "Biseduar me kredimarresin — nuk ka marrëveshje" },
  { value: "with_agreement",    label: "Rasti me Marrëveshje" },
  { value: "failed_agreement",  label: "Me marrëveshje të dështuar" },
  { value: "payment_commitment",label: "Rasti me zotim për pagesë" },
  { value: "disputing_debt",    label: "Rasti konteston borxhin" },
  { value: "refuses_to_pay",    label: "Rasti nuk pranon të paguajë" },
  { value: "other",             label: "Të ndryshme" },
];

const CALL_OUTCOMES = [
  { value: "NO_ANSWER",        label: "Nuk Është Përgjigjur" },
  { value: "CONTACTED",        label: "Kontaktuar — Pa Premtim" },
  { value: "PROMISE_RECEIVED", label: "Kontaktuar — Me Premtim" },
  { value: "REFUSED",          label: "Ka Refuzuar" },
  { value: "DISPUTE",          label: "Ka Kundërshtuar Borxhin" },
  { value: "DECEASED",         label: "I/E Ndjerë" },
];
const VISIT_OUTCOMES = [
  { value: "NO_ANSWER",        label: "Nuk Ishte në Shtëpi" },
  { value: "CONTACTED",        label: "Kontaktuar — Pa Premtim" },
  { value: "PROMISE_RECEIVED", label: "Kontaktuar — Me Premtim" },
  { value: "REFUSED",          label: "Ka Refuzuar" },
  { value: "DISPUTE",          label: "Ka Kundërshtuar Borxhin" },
];
const MEETING_OUTCOMES = [
  { value: "CONTACTED",        label: "Takim i suksesshëm — Pa Premtim" },
  { value: "PROMISE_RECEIVED", label: "Takim i suksesshëm — Me Premtim" },
  { value: "REFUSED",          label: "Ka Refuzuar" },
  { value: "DISPUTE",          label: "Ka Kundërshtuar Borxhin" },
];
const LOG_OUTCOME_MAP: Record<string, { value: string; label: string }[]> = {
  CALL_BORROWER: CALL_OUTCOMES,
  CALL_GUARANTOR: CALL_OUTCOMES,
  VISIT_BORROWER: VISIT_OUTCOMES,
  VISIT_GUARANTOR: VISIT_OUTCOMES,
  MEETING_BORROWER: MEETING_OUTCOMES,
  MEETING_GUARANTOR: MEETING_OUTCOMES,
};
const LOG_PROMISE_TYPES  = new Set(["PROMISE_TO_PAY", "CALL_BORROWER", "CALL_GUARANTOR", "VISIT_BORROWER", "VISIT_GUARANTOR", "MEETING_BORROWER", "MEETING_GUARANTOR"]);
const LOG_FOLLOWUP_TYPES = new Set(["CALL_BORROWER", "CALL_GUARANTOR", "VISIT_BORROWER", "VISIT_GUARANTOR", "MEETING_BORROWER", "MEETING_GUARANTOR"]);
const LOG_SHOW_ADDRESS   = new Set(["VISIT_BORROWER", "VISIT_GUARANTOR", "MEETING_BORROWER", "MEETING_GUARANTOR"]);
const LOG_SHOW_PHONE     = new Set(["CALL_BORROWER", "CALL_GUARANTOR", "VISIT_BORROWER", "VISIT_GUARANTOR", "MEETING_BORROWER", "MEETING_GUARANTOR"]);
const LOG_SHOW_DOC       = new Set(["WARNING_LETTER", "SMS", "LEGAL_ACTION", "LETTER"]);

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function relativeDay(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return "Sot";
  if (isSameDay(d, yesterday)) return "Dje";
  return fmtDate(dateStr);
}

export default function ActivitiesPage() {
  const router = useRouter();
  const { user, scopedToSelf, scopedToOffice, can } = useAuth();
  const [refreshing, triggerRefresh] = useRefreshing();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [typeFilter, setTypeFilter] = useState("");
  const [officerFilter, setOfficerFilter] = useState("");
  const [actDatePreset, setActDatePreset] = useState<DatePreset>("");
  const [actDateFrom, setActDateFrom] = useState("");
  const [actDateTo, setActDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [officers, setOfficers] = useState<any[]>([]);

  // Log Activity modal
  const [showLog, setShowLog] = useState(false);
  const [logCaseId, setLogCaseId] = useState("");
  const [logCaseLabel, setLogCaseLabel] = useState("");
  const [caseQuery, setCaseQuery] = useState("");
  const [caseResults, setCaseResults] = useState<any[]>([]);
  const [caseSearching, setCaseSearching] = useState(false);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const caseSearchRef = useRef<HTMLDivElement>(null);
  const [logType, setLogType] = useState("");
  const [logOutcome, setLogOutcome] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logPromise, setLogPromise] = useState("");
  const [logPromiseDate, setLogPromiseDate] = useState("");
  const [logNextDate, setLogNextDate] = useState("");
  const [logCaseCategory, setLogCaseCategory] = useState("");
  const [logUpdatedAddress, setLogUpdatedAddress] = useState("");
  const [logUpdatedPhone, setLogUpdatedPhone] = useState("");
  const [logDocFile, setLogDocFile] = useState<File | null>(null);
  const logFileRef = useRef<HTMLInputElement>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState("");

  useEffect(() => {
    if (!scopedToSelf) {
      usersApi.list().then((list) => setOfficers(list)).catch(() => {});
    }
  }, [scopedToSelf]);

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, any> = { page: p, limit: 100 };
      if (typeFilter)  params.activityType = typeFilter;
      if (actDateFrom) params.from = actDateFrom;
      if (actDateTo)   params.to   = actDateTo;
      if (!scopedToSelf && officerFilter) params.officerId = officerFilter;
      if (scopedToSelf   && user?.id)       params.officerId = user.id;
      if (scopedToOffice && user?.officeId) params.officeId  = user.officeId;
      const res = await activitiesApi.listAll(params);
      setData(res.data);
      setMeta(res.meta);
      setPage(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [typeFilter, officerFilter, actDateFrom, actDateTo, scopedToSelf, scopedToOffice, user?.id, user?.officeId]);

  useEffect(() => { setData([]); load(1); }, [load]);

  // Debounced case search
  useEffect(() => {
    if (!caseQuery.trim()) { setCaseResults([]); setShowCaseDropdown(false); return; }
    const timer = setTimeout(async () => {
      setCaseSearching(true);
      try {
        const params: any = { search: caseQuery.trim(), limit: 10 };
        if (scopedToSelf && user?.id) params.officerId = user.id;
        if (scopedToOffice && user?.officeId) params.officeId = user.officeId;
        const res = await casesApi.list(params);
        setCaseResults(res.data ?? []);
        setShowCaseDropdown(true);
      } catch { setCaseResults([]); }
      finally { setCaseSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [caseQuery, scopedToSelf, scopedToOffice, user?.id, user?.officeId]);

  // Close case dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (caseSearchRef.current && !caseSearchRef.current.contains(e.target as Node)) {
        setShowCaseDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openLogModal() { setShowLog(true); setLogError(""); }
  function closeLog() {
    setShowLog(false); setLogCaseId(""); setLogCaseLabel(""); setCaseQuery("");
    setCaseResults([]); setShowCaseDropdown(false);
    setLogType(""); setLogOutcome(""); setLogNotes("");
    setLogDate(new Date().toISOString().split("T")[0]);
    setLogPromise(""); setLogPromiseDate(""); setLogNextDate("");
    setLogCaseCategory(""); setLogUpdatedAddress(""); setLogUpdatedPhone("");
    setLogDocFile(null); setLogError("");
  }
  function handleLogTypeChange(t: string) {
    setLogType(t); setLogOutcome(""); setLogPromise("");
    setLogPromiseDate(""); setLogNextDate("");
  }
  async function submitLog() {
    if (!logCaseId) { setLogError("Ju lutem zgjidhni një rast."); return; }
    if (!logType) { setLogError("Zgjidhni llojin e aktivitetit."); return; }
    const outcomeOptions = LOG_OUTCOME_MAP[logType] ?? [];
    if (outcomeOptions.length > 0 && !logOutcome) { setLogError("Zgjidhni rezultatin."); return; }
    if (!logNotes.trim()) { setLogError("Shënimet janë të detyrueshme."); return; }
    const showPromise = LOG_PROMISE_TYPES.has(logType) && (logType === "PROMISE_TO_PAY" || logOutcome === "PROMISE_RECEIVED");
    const showFollowup = LOG_FOLLOWUP_TYPES.has(logType) && !showPromise;
    setLogging(true); setLogError("");
    try {
      await activitiesApi.log(logCaseId, {
        officerId: user!.id,
        activityType: logType,
        outcome: logOutcome || undefined,
        notes: logNotes.trim(),
        occurredAt: logDate ? new Date(logDate).toISOString() : undefined,
        promiseAmount: logPromise ? Number(logPromise) : undefined,
        nextActionDate: (showPromise && logPromiseDate) ? logPromiseDate : (showFollowup && logNextDate) ? logNextDate : undefined,
        updatedAddress: logUpdatedAddress.trim() || undefined,
        updatedPhone: logUpdatedPhone.trim() || undefined,
        caseCategory: logCaseCategory || undefined,
      });
      if (logDocFile) {
        try {
          const { documents: docsApi2 } = await import("@/lib/api");
          await docsApi2.upload(logCaseId, logDocFile, "CORRESPONDENCE");
        } catch {}
      }
      closeLog(); load(1);
      toast("Aktiviteti u regjistrua");
    } catch (e: any) { setLogError(e.message); }
    finally { setLogging(false); }
  }

  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? data.filter((a) => {
    const borrower = a.case?.loan?.borrower;
    const name = borrower ? `${borrower.fullName}`.toLowerCase() : "";
    const ref = (a.case?.caseReference ?? "").toLowerCase();
    const notes = (a.notes ?? "").toLowerCase();
    return name.includes(q) || ref.includes(q) || notes.includes(q);
  }) : data;

  const grouped: { day: string; items: any[] }[] = [];
  for (const a of filtered) {
    const day = a.occurredAt ? relativeDay(a.occurredAt) : "Pa datë";
    const last = grouped[grouped.length - 1];
    if (last && last.day === day) last.items.push(a);
    else grouped.push({ day, items: [a] });
  }

  const total = meta?.total ?? 0;
  const pages = meta?.pages ?? 1;

  return (
    <div className="flex flex-col">
      <Topbar
        title="Aktivitete"
        subtitle={loading ? "Duke ngarkuar…" : `${total.toLocaleString()} ndërveprime të regjistruara`}
        help={[
          { title: "Çfarë është kjo faqe?", body: "Regjistri i plotë i çdo kontakti me debitorët — telefonata, email, vizita, premtime pagese. Klikoni çdo rresht për të hapur rastin." },
          { title: "Vizita në Terren", body: "Filtro sipas 'Vizita Terren' për të parë vetëm vizitat fizike. Butonin 'Regjistro Vizitë' e keni në krye për të shtuar vizitë të re." },
        ]}
      />

      {/* Log Activity Modal */}
      {showLog && (() => {
        const lbl = "text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block";
        const tinp = "w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors";
        const outcomeOptions = LOG_OUTCOME_MAP[logType] ?? [];
        const showPromise = LOG_PROMISE_TYPES.has(logType) && (logType === "PROMISE_TO_PAY" || logOutcome === "PROMISE_RECEIVED");
        const showFollowup = LOG_FOLLOWUP_TYPES.has(logType) && !showPromise;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop" onClick={closeLog}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-modal-in modal-panel max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-[15px] font-semibold text-gray-900">Regjistro Aktivitet</h2>
                <button onClick={closeLog} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                {logError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{logError}</div>}

                {/* Case search */}
                <div>
                  <label className={lbl}>Rast <span className="text-red-500">*</span></label>
                  <div className="relative" ref={caseSearchRef}>
                    {logCaseId ? (
                      <div className="flex items-center gap-2 px-3 py-2 border border-brand-400 rounded-lg bg-brand-50">
                        <span className="flex-1 text-[13px] text-gray-800">{logCaseLabel}</span>
                        <button type="button" onClick={() => { setLogCaseId(""); setLogCaseLabel(""); setCaseQuery(""); }} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={caseQuery}
                            onChange={(e) => setCaseQuery(e.target.value)}
                            onFocus={() => caseResults.length > 0 && setShowCaseDropdown(true)}
                            placeholder="Kërko me emër ose referencë…"
                            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors"
                          />
                          {caseSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />}
                        </div>
                        {showCaseDropdown && caseResults.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {caseResults.map((c) => {
                              const borrower = c.loan?.borrower;
                              const name = borrower ? `${borrower.fullName}` : "I panjohur";
                              const label = `${c.caseReference} — ${name}`;
                              return (
                                <button key={c.id} type="button"
                                  onMouseDown={(e) => { e.preventDefault(); setLogCaseId(c.id); setLogCaseLabel(label); setShowCaseDropdown(false); setCaseQuery(""); }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-gray-800 hover:bg-brand-50 transition-colors border-b border-gray-100 last:border-0">
                                  <span className="font-medium text-brand-700">{c.caseReference}</span>
                                  <span className="text-gray-500"> — {name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {showCaseDropdown && caseResults.length === 0 && !caseSearching && caseQuery.trim() && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-3 text-[13px] text-gray-400">
                            Nuk u gjet asnjë rast.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Type + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Lloji i Aktivitetit <span className="text-red-500">*</span></label>
                    <Select value={logType} onChange={handleLogTypeChange} placeholder="Zgjidhni llojin…" options={ACT_TYPE_OPTIONS} />
                  </div>
                  <div>
                    <label className={lbl}>Data</label>
                    <DatePicker value={logDate} onChange={setLogDate} placeholder="Sot" />
                  </div>
                </div>

                {/* Conditional fields */}
                <div style={{ display: "grid", gridTemplateRows: logType ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                  <div style={{ overflow: "hidden" }}>
                    <div className="space-y-3 pt-1">
                      {outcomeOptions.length > 0 && (
                        <div>
                          <label className={lbl}>Rezultati <span className="text-red-500">*</span></label>
                          <Select value={logOutcome} onChange={setLogOutcome} placeholder="Zgjidhni rezultatin…" options={outcomeOptions} />
                        </div>
                      )}
                      {showPromise && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={lbl}>Shuma e Premtimit (€)</label>
                            <input type="number" min="0" step="0.01" value={logPromise}
                              onChange={(e) => setLogPromise(e.target.value)} placeholder="0.00" className={tinp} />
                          </div>
                          <div>
                            <label className={lbl}>Data e Premtimit</label>
                            <DatePicker value={logPromiseDate} onChange={setLogPromiseDate} placeholder="Zgjidhni datën" />
                          </div>
                        </div>
                      )}
                      {showFollowup && (
                        <div>
                          <label className={lbl}>Ndjekja e Radhës</label>
                          <DatePicker value={logNextDate} onChange={setLogNextDate} placeholder="Zgjidhni datën" />
                        </div>
                      )}
                      <div>
                        <label className={lbl}>Kategoria e Rastit</label>
                        <Select value={logCaseCategory} onChange={setLogCaseCategory} placeholder="Zgjidhni kategorinë…" options={CASE_CATEGORY_OPTIONS} clearable />
                      </div>
                      {(LOG_SHOW_ADDRESS.has(logType) || LOG_SHOW_PHONE.has(logType)) && (
                        <div className={LOG_SHOW_ADDRESS.has(logType) && LOG_SHOW_PHONE.has(logType) ? "grid grid-cols-2 gap-3" : ""}>
                          {LOG_SHOW_ADDRESS.has(logType) && (
                            <div>
                              <label className={lbl}>Adresa e Re e Siguruar</label>
                              <input value={logUpdatedAddress} onChange={(e) => setLogUpdatedAddress(e.target.value)}
                                placeholder="Rruga, ndërtesa, qyteti…" className={tinp} />
                            </div>
                          )}
                          {LOG_SHOW_PHONE.has(logType) && (
                            <div>
                              <label className={lbl}>Numri i Telefonit i Siguruar</label>
                              <input value={logUpdatedPhone} onChange={(e) => setLogUpdatedPhone(e.target.value)}
                                placeholder="+383 44 …" className={tinp} />
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <label className={lbl}>Shënime <span className="text-red-500">*</span></label>
                        <textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3}
                          placeholder="Çfarë ndodhi gjatë këtij aktiviteti?"
                          className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors resize-none" />
                      </div>
                      {LOG_SHOW_DOC.has(logType) && (
                        <div>
                          <label className={lbl}>Ngarko Dokument (PDF / Word)</label>
                          <input ref={logFileRef} type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => setLogDocFile(e.target.files?.[0] ?? null)}
                            className="w-full text-[13px] text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
                          {logDocFile && <p className="mt-1 text-[11px] text-gray-400">{logDocFile.name} · {(logDocFile.size / 1024).toFixed(0)} KB</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes visible before type is selected */}
                {!logType && (
                  <div>
                    <label className={lbl}>Shënime <span className="text-red-500">*</span></label>
                    <textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3}
                      placeholder="Çfarë ndodhi gjatë këtij aktiviteti?"
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors resize-none" />
                  </div>
                )}
              </div>
              <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
                <button onClick={closeLog} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Anulo</button>
                <button onClick={submitLog} disabled={logging}
                  className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {logging ? "Duke ruajtur…" : "Regjistro Aktivitetin"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="p-4 md:p-6 space-y-4">

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        {isMobile ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kërko aktivitete…"
                  className="w-full pl-9 pr-3 py-2.5 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-400"
                />
              </div>
              {can("field-visit:create") && (
                <button onClick={openLogModal}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-brand-600 text-white rounded-xl text-[12px] font-medium shrink-0 whitespace-nowrap">
                  <Plus size={13} /> Regjistro
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              <MobileFilterSheet
                groups={[
                  {
                    key: "typeFilter",
                    label: "Lloji",
                    value: typeFilter,
                    onChange: setTypeFilter,
                    options: ACTIVITY_FILTER_GROUPS.filter((g) => g.key !== "").map((g) => ({ value: g.key, label: g.label })),
                  },
                  {
                    key: "actDatePreset",
                    label: "Periudha",
                    value: actDatePreset,
                    onChange: (v) => {
                      const p = v as DatePreset;
                      setActDatePreset(p);
                      const r = p ? presetToRange(p) : { from: "", to: "" };
                      setActDateFrom(r.from);
                      setActDateTo(r.to);
                    },
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
                  ...(!scopedToSelf ? [{
                    key: "officerFilter",
                    label: "Oficeri",
                    value: officerFilter,
                    onChange: setOfficerFilter,
                    allLabel: "Të gjithë",
                    options: officers.map((o: any) => ({ value: o.id, label: o.fullName })),
                  }] : []),
                ]}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kërko aktivitete…"
                  className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
                />
              </div>
              <DatePresetPicker label="Periudha" value={actDatePreset} onChange={(p, r) => { setActDatePreset(p); setActDateFrom(r.from); setActDateTo(r.to); }} />
              {!scopedToSelf && (
                <Select
                  value={officerFilter}
                  onChange={setOfficerFilter}
                  label="Oficeri"
                  placeholder="Të gjithë"
                  clearable
                  className="w-44 shrink-0"
                  options={officers.map((o: any) => ({ value: o.id, label: o.fullName }))}
                />
              )}
              {can("field-visit:create") && (
                <button onClick={openLogModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors ml-auto shrink-0">
                  <Plus size={14} /> Regjistro Aktivitet
                </button>
              )}
            </div>
            <div className="flex items-center border-b border-gray-200 overflow-x-auto overflow-y-hidden scrollbar-hide">
              {ACTIVITY_FILTER_GROUPS.map(({ key, label }) => (
                <button key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    typeFilter === key
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}>
                  {label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1 pb-px shrink-0">
                <span className="text-[12px] text-gray-400">{!loading && `${filtered.length} ${filtered.length === 1 ? "aktivitet" : "aktivitete"}`}</span>
                <button onClick={() => triggerRefresh(() => load(1))} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
            {error} — <button onClick={() => load()} className="underline">Riprovo</button>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 md:px-5 py-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                  <div className="h-2.5 w-56 bg-gray-100 rounded" />
                </div>
                <div className="h-2.5 w-12 bg-gray-100 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Activity size={22} className="text-gray-400" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën aktivitete</div>
              <div className="text-[12px] text-gray-400 max-w-xs">
                {(typeFilter || actDateFrom || actDateTo || officerFilter || q)
                  ? "Provoni të ndryshoni filtrat ose kërkimin."
                  : "Aktivitetet regjistrohen nga oficerët gjatë punës me rastet."}
              </div>
            </div>
            {(typeFilter || actDateFrom || actDateTo || officerFilter || q) && (
              <button onClick={() => { setTypeFilter(""); setActDatePreset(""); setActDateFrom(""); setActDateTo(""); setOfficerFilter(""); setSearchQuery(""); }}
                className="text-[12px] text-brand-600 hover:text-brand-700 underline">
                Fshi të gjitha filtrat
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ day, items }) => (
              <div key={day}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{day}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-300">{items.length} {items.length === 1 ? "regjistrim" : "regjistrime"}</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  {items.map((a, i) => {
                    const tm = TYPE_META[a.activityType] ?? { icon: Clock, label: a.activityType, color: "text-gray-500", bg: "bg-gray-100" };
                    const Icon = tm.icon;
                    const om = a.outcome ? (OUTCOME_META[a.outcome] ?? { label: a.outcome, color: "text-gray-500", bg: "bg-gray-100" }) : null;
                    const debtor = a.case?.loan?.borrower ? `${a.case.loan.borrower.fullName}` : null;
                    const officerName = a.officer?.fullName ?? null;
                    const caseRef = a.case?.caseReference ?? null;
                    const isToday = a.occurredAt ? isSameDay(new Date(a.occurredAt), new Date()) : false;
                    const time = a.occurredAt ? (isToday ? fmtTime(a.occurredAt) : fmtDate(a.occurredAt)) : null;
                    const nextAction = a.nextActionDate
                      ? new Date(a.nextActionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
                      : null;
                    return (
                      <div key={a.id ?? i}
                        onClick={() => a.case?.id && router.push(`/cases/${a.case.id}`)}
                        className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-gray-50/60 cursor-pointer transition-colors group">
                        <div className={`w-8 h-8 rounded-xl ${tm.bg} flex items-center justify-center shrink-0`}>
                          <Icon size={14} className={tm.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Row 1: type · debtor · ref · outcome */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[11px] font-semibold shrink-0 ${tm.color}`}>{tm.label}</span>
                            {debtor && <span className="text-[13px] font-semibold text-gray-900 truncate">{debtor}</span>}
                            {caseRef && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline">{caseRef}</span>}
                            {om && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${om.bg} ${om.color}`}>{om.label}</span>}
                          </div>
                          {/* Row 2: officer · notes · promise · next action */}
                          <div className="flex items-center gap-2 mt-0.5 min-w-0 overflow-hidden">
                            {officerName && <span className="text-[11px] text-gray-400 shrink-0">{officerName.split(" ")[0]}</span>}
                            {a.notes && <span className="text-[11px] text-gray-400 truncate">{officerName ? "· " : ""}{a.notes}</span>}
                            {a.promiseAmount > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-700 shrink-0">· Premtim €{Number(a.promiseAmount).toLocaleString()}</span>
                            )}
                            {nextAction && <span className="text-[11px] text-gray-400 shrink-0">· {nextAction}</span>}
                            {!officerName && !a.notes && !a.promiseAmount && !nextAction && (
                              <span className="text-[11px] text-gray-300">—</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {time && <span className="text-[11px] text-gray-400 whitespace-nowrap">{time}</span>}
                          <ChevronRight size={13} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {pages > 1 && (
              <div className="flex items-center justify-between text-[12px] text-gray-500 px-1">
                <span>{((page - 1) * 100) + 1}–{Math.min(page * 100, total)} nga {total.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => { document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" }); load(page - 1); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="tabular-nums min-w-[60px] text-center">{page} / {pages}</span>
                  <button disabled={page >= pages} onClick={() => { document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" }); load(page + 1); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
