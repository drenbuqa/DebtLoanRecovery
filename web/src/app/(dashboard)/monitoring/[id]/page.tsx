"use client";

import { useState } from "react";
import { useRefreshing } from "@/lib/useRefreshing";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";

import Topbar from "@/components/layout/Topbar";
import { AccessGuard } from "@/components/AccessGuard";
import { formatCurrency } from "@/lib/utils";
import { monitoring as monitoringApi } from "@/lib/api";
import {
  ArrowLeft, Users, TrendingUp, AlertTriangle,
  Activity, CheckCircle, Clock,
  ChevronRight, RefreshCw, Phone, MapPin, MessageSquare,
  XCircle, Mail, FileText, CreditCard, CheckSquare,
} from "lucide-react";

// ── Label maps ───────────────────────────────────────────────

const FAZA_LABEL: Record<string, string> = {
  KLIENT_I_RI:            "Klient i Ri",
  PAKONTAKTUAR:           "I Pakontaktuar",
  ZOTIM_PAGESE:           "Zotim Pagese",
  ME_MARREVESHJE:         "Me Marrëveshje",
  KONTESTIM_BORGJI:       "Kontestim Borgji",
  NUK_PRANON_MARREVESHJE: "Nuk Pranon",
  JURIDIKE:               "Juridike",
  TJERA:                  "Të Tjera",
};

const PROMISE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: "Në pritje",     color: "text-amber-700",   bg: "bg-amber-50" },
  KEPT:     { label: "Mbajtur",       color: "text-emerald-700", bg: "bg-emerald-50" },
  BROKEN:   { label: "Thyer",         color: "text-red-700",     bg: "bg-red-50" },
  PARTIAL:  { label: "Pjesërisht",    color: "text-orange-700",  bg: "bg-orange-50" },
  CANCELLED:{ label: "Anuluar",       color: "text-gray-500",    bg: "bg-gray-100" },
};

const TYPE_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  CALL:              { icon: Phone,         label: "Telefonatë",           color: "text-gray-500",    bg: "bg-gray-100" },
  CALL_BORROWER:     { icon: Phone,         label: "Tel. Huamarrës",       color: "text-gray-500",    bg: "bg-gray-100" },
  CALL_GUARANTOR:    { icon: Phone,         label: "Tel. Garantori",       color: "text-gray-500",    bg: "bg-gray-100" },
  VISIT:             { icon: MapPin,        label: "Vizitë",               color: "text-gray-500",    bg: "bg-gray-100" },
  VISIT_BORROWER:    { icon: MapPin,        label: "Vizitë Huamarrës",     color: "text-gray-500",    bg: "bg-gray-100" },
  VISIT_GUARANTOR:   { icon: MapPin,        label: "Vizitë Garantori",     color: "text-gray-500",    bg: "bg-gray-100" },
  FIELD_VISIT:       { icon: MapPin,        label: "Vizitë në Terren",     color: "text-brand-600",   bg: "bg-brand-50" },
  SMS:               { icon: MessageSquare, label: "SMS",                  color: "text-gray-500",    bg: "bg-gray-100" },
  EMAIL:             { icon: Mail,          label: "Email",                color: "text-gray-500",    bg: "bg-gray-100" },
  LETTER:            { icon: FileText,      label: "Letër",                color: "text-gray-500",    bg: "bg-gray-100" },
  WARNING_LETTER:    { icon: AlertTriangle, label: "Letër Paralajmëruese", color: "text-amber-600",   bg: "bg-amber-50" },
  PROMISE_TO_PAY:    { icon: CheckSquare,   label: "Premtim Pagese",       color: "text-amber-600",   bg: "bg-amber-50" },
  PAYMENT_RECEIVED:  { icon: CreditCard,    label: "Pagesë e Marrë",       color: "text-emerald-600", bg: "bg-emerald-50" },
  LEGAL_ACTION:      { icon: FileText,      label: "Veprim Ligjor",        color: "text-brand-600",   bg: "bg-brand-50" },
  MEETING_BORROWER:  { icon: Activity,      label: "Takim Huamarrës",      color: "text-gray-500",    bg: "bg-gray-100" },
  MEETING_GUARANTOR: { icon: Activity,      label: "Takim Garantori",      color: "text-gray-500",    bg: "bg-gray-100" },
  NOTE:              { icon: Clock,         label: "Shënim",               color: "text-gray-500",    bg: "bg-gray-100" },
};

const OUTCOME_META: Record<string, { label: string; color: string; bg: string }> = {
  CONTACTED:        { label: "Kontaktuar",         color: "text-gray-600",    bg: "bg-gray-100" },
  NO_ANSWER:        { label: "Nuk u përgjigj",     color: "text-gray-500",    bg: "bg-gray-100" },
  PROMISE_RECEIVED: { label: "Premtim i marrë",    color: "text-amber-700",   bg: "bg-amber-50" },
  FULL_PAYMENT:     { label: "Pagesë e plotë",     color: "text-emerald-700", bg: "bg-emerald-50" },
  PARTIAL_PAYMENT:  { label: "Pagesë pjesshme",    color: "text-emerald-600", bg: "bg-emerald-50" },
  REFUSED:          { label: "Refuzuar",           color: "text-red-700",     bg: "bg-red-50" },
  DISPUTE:          { label: "Kundërshtim",        color: "text-orange-700",  bg: "bg-orange-50" },
  DECEASED:         { label: "I/E Ndjerë",         color: "text-gray-600",    bg: "bg-gray-200" },
  ESCALATED:        { label: "Eskaluar",           color: "text-brand-700",   bg: "bg-brand-50" },
  OTHER:            { label: "Tjetër",             color: "text-gray-500",    bg: "bg-gray-100" },
};

// ── Helpers ──────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(d: string | Date): string {
  return new Date(d).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" });
}
function fmtDayHeader(d: string | Date): string {
  const date = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  date.setHours(0,0,0,0);
  if (date.getTime() === today.getTime()) return "Sot";
  if (date.getTime() === yesterday.getTime()) return "Dje";
  return date.toLocaleDateString("sq-AL", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

// ── KPI card ─────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, urgent }: { label: string; value: string | number; icon: React.ElementType; urgent?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border px-4 py-3.5 flex items-center gap-3 ${urgent ? "border-red-200" : "border-gray-200"}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${urgent ? "bg-red-50" : "bg-gray-100"}`}>
        <Icon size={15} className={urgent ? "text-red-500" : "text-gray-500"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-medium text-gray-400 uppercase tracking-wide leading-tight mb-1.5">{label}</div>
        <div className={`text-[19px] font-bold tabular-nums leading-none ${urgent ? "text-red-600" : "text-gray-900"}`}>{value}</div>
      </div>
    </div>
  );
}

// ── Shared table header style ─────────────────────────────────

function TH({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/50 whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

// ── Cases tab ────────────────────────────────────────────────

function CasesTab({ cases }: { cases: any[] }) {
  return <CaseTable rows={cases} emptyIcon={Users} emptyMsg="Ky oficer nuk ka klientë të caktuar" />;
}

// ── Shared case-columns table (used by all non-activity tabs) ─

function CaseTable({ rows, emptyIcon: EmptyIcon, emptyMsg, getPromise }: {
  rows: any[];
  emptyIcon: React.ElementType;
  emptyMsg: string;
  getPromise?: (row: any) => any;
}) {
  const now = new Date();
  if (rows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <EmptyIcon size={24} className="text-gray-200 mb-2" />
      <p className="text-[13px] text-gray-400">{emptyMsg}</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100">
            <TH>Emri / ID</TH>
            <TH>Telefon</TH>
            <TH>Adresa</TH>
            <TH>Banka</TH>
            <TH>Borxhi</TH>
            <TH>Qyteti</TH>
            <TH>Faza</TH>
            <TH>Garant 1</TH>
            <TH>Garant 2</TH>
            <TH>Bashkëkreditues</TH>
            <TH>Premtimi</TH>
            <TH>Ndjekja e Radhës</TH>
            <th className="py-2.5 px-3 bg-gray-50/50 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row: any) => {
            // Support both case rows and promise rows (p.case)
            const c = row.case ?? row;
            const b = c.loan?.borrower;
            const parties = c.loan?.relatedParties ?? [];
            const guarantors = parties.filter((p: any) => p.role === "GUARANTOR");
            const coborrower = parties.find((p: any) => p.role === "CO_BORROWER");
            const phone = b?.phones?.[0]?.phoneNumber;
            const nextOverdue = c.nextActionDate && new Date(c.nextActionDate) < now;
            const latestPromise = getPromise ? getPromise(row) : (c.latestPromise ?? (c.promises ?? c.promisesToPay)?.[0]);
            const promiseDaysOverdue = (() => {
              if (!latestPromise) return 0;
              const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date());
              const promiseStr = new Date(latestPromise.promiseDate).toISOString().slice(0, 10);
              if (promiseStr >= todayStr) return 0;
              return Math.round((new Date(todayStr).getTime() - new Date(promiseStr).getTime()) / 86400000);
            })();
            const caseId = c.id;
            return (
              <tr key={row.id} className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                onClick={() => caseId && (window.location.href = `/cases/${caseId}`)}>
                <td className="py-2 px-3">
                  <div className="text-[12px] font-semibold text-gray-900 truncate max-w-[160px]">
                    {b?.fullName ?? "—"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-mono">
                      {b?.personalId?.startsWith("NOID-") ? "—" : (b?.personalId ?? c.caseReference)}
                    </span>
                    {c.status && c.status !== "ACTIVE" && (() => {
                      const cfg: Record<string, { label: string; color: string }> = {
                        LEGAL:     { label: "Juridike",  color: "bg-red-100 text-red-700" },
                        SUSPENDED: { label: "Pezulluar", color: "bg-amber-100 text-amber-700" },
                        CLOSED:    { label: "Mbyllur",   color: "bg-gray-100 text-gray-500" },
                        ANKES:     { label: "Ankesë",    color: "bg-purple-100 text-purple-700" },
                        AKTGJYKIM: { label: "Aktgjykim", color: "bg-blue-100 text-blue-700" },
                      };
                      const s = cfg[c.status];
                      return s ? <span className={`inline-block px-1.5 py-px rounded text-[9px] font-semibold leading-tight ${s.color}`}>{s.label}</span> : null;
                    })()}
                  </div>
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span className="text-[11px] text-gray-600 font-mono">{phone ?? "—"}</span>
                </td>
                <td className="py-2 px-3">
                  <div className="text-[11px] text-gray-500 truncate max-w-[120px]">{b?.address ?? "—"}</div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-[11px] text-gray-600 truncate">{c.loan?.institution?.shortName ?? "—"}</div>
                  <div className="text-[10px] text-gray-400 font-mono truncate">{c.loan?.loanNumber ?? ""}</div>
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span className="text-[12px] font-bold text-gray-900 tabular-nums">
                    {formatCurrency(Number(c.loan?.currentOutstandingBalance ?? 0))}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="text-[11px] text-gray-500 truncate">{b?.city ?? "—"}</div>
                </td>
                <td className="py-2 px-3">
                  <span className="text-[11px] text-gray-600">
                    {c.collectionStatus ? (FAZA_LABEL[c.collectionStatus] ?? c.collectionStatus) : "—"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="text-[11px] text-gray-600 truncate max-w-[100px]">{guarantors[0]?.person?.fullName ?? "—"}</div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-[11px] text-gray-500 truncate max-w-[100px]">{guarantors[1]?.person?.fullName ?? "—"}</div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-[11px] text-gray-500 truncate max-w-[100px]">{coborrower?.person?.fullName ?? "—"}</div>
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  {latestPromise ? (
                    <div>
                      <div className="text-[11px] font-medium text-gray-700">
                        {new Date(latestPromise.promiseDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      <div className="text-[10px] text-gray-400">{formatCurrency(Number(latestPromise.promisedAmount ?? 0))}</div>
                      {promiseDaysOverdue > 0 && (
                        <div className={`text-[10px] font-semibold ${promiseDaysOverdue > 30 ? "text-red-600" : "text-amber-600"}`}>
                          {promiseDaysOverdue} ditë vonesë
                        </div>
                      )}
                    </div>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2 px-3">
                  {c.nextActionDate ? (
                    <div>
                      <div className={`text-[11px] font-medium ${nextOverdue ? "text-red-500" : "text-gray-700"}`}>
                        {fmtDate(c.nextActionDate)}
                      </div>
                      {c.nextActionNote && (
                        <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{c.nextActionNote}</div>
                      )}
                    </div>
                  ) : <span className="text-gray-300 text-[11px]">—</span>}
                </td>
                <td className="py-2 px-3">
                  <ChevronRight size={13} className="text-gray-200 group-hover:text-brand-500 transition-colors" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Promises tab (shared for Premtimet / Vonesat / Dështimet) ─

function PromisesTab({ promises, mode }: { promises: any[]; mode: "all" | "overdue" | "broken" }) {
  const now = new Date();
  const list = mode === "overdue"
    ? promises.filter((p: any) => p.status === "PENDING" && new Date(p.promiseDate) < now)
    : mode === "broken"
    ? promises.filter((p: any) => p.status === "BROKEN" || p.status === "CANCELLED")
    : promises.filter((p: any) => p.status !== "BROKEN" && p.status !== "CANCELLED");

  const emptyMsg = mode === "overdue" ? "Nuk ka premtime të vonuara"
    : mode === "broken" ? "Nuk ka premtime të dështuara"
    : "Nuk ka premtime të regjistruara";

  return (
    <CaseTable
      rows={list}
      emptyIcon={CheckCircle}
      emptyMsg={emptyMsg}
      getPromise={(p: any) => ({ promiseDate: p.promiseDate, promisedAmount: p.promisedAmount })}
    />
  );
}

// ── Activities tab — grouped by day, matches activities page ──

function ActivitiesTab({ activities }: { activities: any[] }) {
  if (activities.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <Activity size={24} className="text-gray-200 mb-2" />
      <p className="text-[13px] text-gray-400">Nuk ka aktivitete të regjistruara</p>
    </div>
  );

  // Group by day
  const grouped: { day: string; date: Date; items: any[] }[] = [];
  for (const a of activities) {
    const d = a.occurredAt ? new Date(a.occurredAt) : new Date();
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = grouped.find(g => `${g.date.getFullYear()}-${g.date.getMonth()}-${g.date.getDate()}` === dayKey);
    if (existing) { existing.items.push(a); }
    else { grouped.push({ day: fmtDayHeader(d), date: d, items: [a] }); }
  }

  return (
    <div className="p-4 space-y-4">
      {grouped.map(({ day, items }) => (
        <div key={day}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{day}</span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] text-gray-300">{items.length} {items.length === 1 ? "regjistrim" : "regjistrime"}</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {items.map((a: any) => {
              const tm = TYPE_META[a.activityType] ?? { icon: Clock, label: a.activityType?.replace(/_/g, " ") ?? "—", color: "text-gray-500", bg: "bg-gray-100" };
              const Icon = tm.icon;
              const om = a.outcome ? (OUTCOME_META[a.outcome] ?? { label: a.outcome, color: "text-gray-500", bg: "bg-gray-100" }) : null;
              const debtor = a.case?.loan?.borrower?.fullName ?? null;
              const caseRef = a.case?.caseReference ?? null;
              const isToday = a.occurredAt ? isSameDay(new Date(a.occurredAt), new Date()) : false;
              const time = a.occurredAt ? (isToday ? fmtTime(a.occurredAt) : fmtDate(a.occurredAt)) : null;
              const nextAction = a.nextActionDate
                ? new Date(a.nextActionDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" })
                : null;
              return (
                <div key={a.id}
                  onClick={() => a.case?.id && (window.location.href = `/cases/${a.case.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 cursor-pointer transition-colors group">
                  <div className={`w-8 h-8 rounded-xl ${tm.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={tm.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[11px] font-semibold shrink-0 ${tm.color}`}>{tm.label}</span>
                      {debtor && <span className="text-[13px] font-semibold text-gray-900 truncate">{debtor}</span>}
                      {caseRef && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline">{caseRef}</span>}
                      {om && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${om.bg} ${om.color}`}>{om.label}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      {a.notes && <span className="text-[11px] text-gray-400 truncate">{a.notes}</span>}
                      {a.promiseAmount > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-700 shrink-0">
                          · {a.activityType === "PAYMENT_RECEIVED" ? "Pagesë" : "Premtim"} €{Number(a.promiseAmount).toLocaleString()}
                        </span>
                      )}
                      {nextAction && <span className="text-[11px] text-gray-400 shrink-0">· Ndjekja: {nextAction}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {time && <span className="text-[11px] text-gray-400 whitespace-nowrap">{time}</span>}
                    <ChevronRight size={13} className="text-gray-200 group-hover:text-brand-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab types ────────────────────────────────────────────────

type Tab = "cases" | "ndjekja" | "promises" | "overdue" | "broken" | "signal90" | "activities";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "cases",      label: "Klientët",         icon: Users },
  { key: "ndjekja",    label: "Ndjekja e Radhës",  icon: Clock },
  { key: "promises",   label: "Premtimet",         icon: CheckCircle },
  { key: "overdue",    label: "Vonesat",           icon: AlertTriangle },
  { key: "broken",     label: "Dështimet",         icon: XCircle },
  { key: "signal90",   label: "Sinjal 90+",        icon: TrendingUp },
  { key: "activities", label: "Aktivitetet",       icon: Activity },
];

// ── Page ─────────────────────────────────────────────────────

export default function OfficerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>("cases");
  const [refreshing, triggerRefresh] = useRefreshing();

  const { data, isLoading, mutate } = useSWR(
    id ? ["monitoring-officer", id] : null,
    () => monitoringApi.officerDetail(id),
    { revalidateOnFocus: false },
  );

  const officer    = data?.officer;
  const stats      = data?.stats;
  const cases      = data?.cases ?? [];
  const promises   = data?.promises ?? [];
  const activities = data?.recentActivities ?? [];

  const now = new Date();
  const overduePromises = promises.filter((p: any) => p.status === "PENDING" && new Date(p.promiseDate) < now);
  const brokenPromises  = promises.filter((p: any) => p.status === "BROKEN" || p.status === "CANCELLED");

  const ndjekjaCases  = cases.filter((c: any) => !!c.nextActionDate);
  const signal90Cases = cases.filter((c: any) => c.collectionStage === "D4");

  const badgeFor = (key: Tab) => {
    if (key === "cases")      return cases.length;
    if (key === "ndjekja")    return ndjekjaCases.length;
    if (key === "promises")   return promises.filter((p: any) => p.status !== "BROKEN" && p.status !== "CANCELLED").length;
    if (key === "overdue")    return overduePromises.length;
    if (key === "broken")     return brokenPromises.length;
    if (key === "signal90")   return signal90Cases.length;
    if (key === "activities") return activities.length;
    return 0;
  };

  return (
    <AccessGuard permission="page:monitoring">
      <div className="min-h-screen bg-gray-50">
        <Topbar title={officer?.fullName ?? "Duke ngarkuar…"} subtitle={officer?.office?.name ?? ""} />

        <div className="p-4 md:p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5 text-[13px]">
            <button onClick={() => router.push("/monitoring")}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
              <ArrowLeft size={13} />
              Monitorimi
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium">{officer?.fullName}</span>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-[72px] bg-white rounded-xl border border-gray-200 animate-pulse" />)}
              </div>
              <div className="h-96 bg-white rounded-xl border border-gray-200 animate-pulse" />
            </div>
          )}

          {!isLoading && data && (
            <>
              {/* Officer identity */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-3"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-gray-600 text-[13px] font-bold">{initials(officer?.fullName ?? "")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-gray-900">{officer?.fullName}</div>
                  <div className="text-[12px] text-gray-500">
                    {officer?.office?.name ?? "Pa zyrë"} · #{officer?.userCode ?? "—"} · {officer?.role}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <KpiCard label="Klientë aktiv"       value={stats.activeCases}                   icon={Users} />
                <KpiCard label="Portofoli total"      value={formatCurrency(stats.totalBalance)}  icon={TrendingUp} />
                <KpiCard label="Premtime hapura"      value={stats.promisesPending}               icon={Clock} />
                <KpiCard label="Premtime vonuara"     value={stats.promisesOverdue}               icon={AlertTriangle} urgent={stats.promisesOverdue > 0} />
                <KpiCard label="Premtime të mbajtura" value={stats.promisesKept}                  icon={CheckCircle} />
                <KpiCard label="Aktivitete (muaj)"    value={stats.activitiesThisMonth}           icon={Activity} />
              </div>

              {/* Sticky tab bar */}
              <div className="sticky top-14 z-10 bg-gray-50 -mx-4 md:-mx-6 px-4 md:px-6 pb-0">
                <div className="bg-white rounded-t-xl border border-gray-200 flex items-center"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div className="flex overflow-x-auto flex-1 border-b border-gray-100" style={{ scrollbarWidth: "none" }}>
                    {TABS.map(({ key, label, icon: Icon }) => {
                      const badge = badgeFor(key);
                      return (
                        <button key={key} onClick={() => setTab(key)}
                          className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
                            tab === key
                              ? "border-brand-600 text-brand-700"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}>
                          <Icon size={13} />
                          {label}
                          {badge > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              tab === key ? "bg-brand-100 text-brand-700"
                                : key === "overdue" || key === "broken" ? "bg-red-100 text-red-600"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {badge > 999 ? "999+" : badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-b border-gray-100 self-stretch flex items-center pr-2">
                    <button onClick={() => triggerRefresh(() => { mutate(); })}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                      <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab content */}
              <div className="bg-white rounded-b-xl border-x border-b border-gray-200 min-h-56 overflow-hidden"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                {tab === "cases"      && <CasesTab cases={cases} />}
                {tab === "ndjekja"   && <CaseTable rows={ndjekjaCases} emptyIcon={Clock} emptyMsg="Nuk ka klientë me ndjekje të planifikuar" />}
                {tab === "promises"   && <PromisesTab promises={promises} mode="all" />}
                {tab === "overdue"    && <PromisesTab promises={promises} mode="overdue" />}
                {tab === "broken"     && <PromisesTab promises={promises} mode="broken" />}
                {tab === "signal90"   && <CaseTable rows={signal90Cases} emptyIcon={TrendingUp} emptyMsg="Nuk ka klientë në sinjal 90+" />}
                {tab === "activities" && <ActivitiesTab activities={activities} />}
              </div>
            </>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}
