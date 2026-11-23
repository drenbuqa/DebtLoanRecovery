"use client";

import { useState } from "react";
import { useRefreshing } from "@/lib/useRefreshing";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

const STAGE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  D1:    { label: "D1",       color: "text-gray-600",    bg: "bg-gray-100" },
  D2:    { label: "D2",       color: "text-amber-700",   bg: "bg-amber-50" },
  D3:    { label: "D3",       color: "text-orange-700",  bg: "bg-orange-50" },
  D4:    { label: "90+",      color: "text-red-700",     bg: "bg-red-50" },
  LEGAL: { label: "Juridike", color: "text-brand-700",   bg: "bg-brand-50" },
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
  if (cases.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <Users size={24} className="text-gray-200 mb-2" />
      <p className="text-[13px] text-gray-400">Ky oficer nuk ka klientë të caktuar</p>
    </div>
  );

  const now = new Date();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100">
            <TH>Klienti</TH>
            <TH>Referenca</TH>
            <TH>Banka</TH>
            <TH right>Borxhi</TH>
            <TH>Faza</TH>
            <TH>Sinjal</TH>
            <TH>Ndjekja e Radhës</TH>
            <th className="py-2.5 px-3 bg-gray-50/50 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {cases.map((c: any) => {
            const nextOverdue = c.nextActionDate && new Date(c.nextActionDate) < now;
            const stage = c.collectionStage ? STAGE_CFG[c.collectionStage] : null;
            return (
              <tr key={c.id} className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                onClick={() => window.location.href = `/cases/${c.id}`}>
                <td className="py-2 px-3">
                  <div className="text-[12px] font-semibold text-gray-900 truncate max-w-[160px]">
                    {c.loan?.borrower?.fullName ?? "—"}
                  </div>
                  {c.status && c.status !== "ACTIVE" && (() => {
                    const cfg: Record<string, { label: string; color: string }> = {
                      LEGAL:     { label: "Juridike",  color: "bg-red-100 text-red-700" },
                      SUSPENDED: { label: "Pezulluar", color: "bg-amber-100 text-amber-700" },
                      CLOSED:    { label: "Mbyllur",   color: "bg-gray-100 text-gray-500" },
                      ANKES:     { label: "Ankesë",    color: "bg-purple-100 text-purple-700" },
                      AKTGJYKIM: { label: "Aktgjykim", color: "bg-blue-100 text-blue-700" },
                    };
                    const s = cfg[c.status];
                    return s ? <span className={`inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-semibold leading-tight ${s.color}`}>{s.label}</span> : null;
                  })()}
                </td>
                <td className="py-2 px-3">
                  <span className="font-mono text-[11px] text-gray-500">{c.caseReference}</span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-[11px] text-gray-600">{c.loan?.institution?.shortName ?? "—"}</span>
                </td>
                <td className="py-2 px-3 text-right">
                  <span className="text-[12px] font-bold text-gray-900 tabular-nums">
                    {formatCurrency(Number(c.loan?.currentOutstandingBalance ?? 0))}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-[11px] text-gray-600">
                    {c.collectionStatus ? (FAZA_LABEL[c.collectionStatus] ?? c.collectionStatus) : "—"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  {stage ? (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${stage.bg} ${stage.color}`}>
                      {stage.label}
                    </span>
                  ) : <span className="text-gray-300 text-[11px]">—</span>}
                </td>
                <td className="py-2 px-3">
                  {c.nextActionDate ? (
                    <div>
                      <div className={`text-[11px] font-medium ${nextOverdue ? "text-red-500" : "text-gray-700"}`}>
                        {fmtDate(c.nextActionDate)}
                      </div>
                      {c.nextActionNote && (
                        <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{c.nextActionNote}</div>
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

  if (list.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <CheckCircle size={24} className="text-gray-200 mb-2" />
      <p className="text-[13px] text-gray-400">{emptyMsg}</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100">
            <TH>Klienti</TH>
            <TH>Referenca</TH>
            <TH right>Shuma</TH>
            <TH>Data e Premtimit</TH>
            <TH>Statusi</TH>
            <TH>Shënim</TH>
            <th className="py-2.5 px-3 bg-gray-50/50 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {list.map((p: any) => {
            const isPast = p.status === "PENDING" && new Date(p.promiseDate) < now;
            const statusCfg = PROMISE_LABEL[p.status];
            const daysOverdue = isPast
              ? Math.round((now.getTime() - new Date(p.promiseDate).getTime()) / 86400000)
              : 0;
            return (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group">
                <td className="py-2 px-3">
                  <div className="text-[12px] font-semibold text-gray-900 truncate max-w-[160px]">
                    {p.case?.loan?.borrower?.fullName ?? "—"}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span className="font-mono text-[11px] text-gray-500">{p.case?.caseReference ?? "—"}</span>
                </td>
                <td className="py-2 px-3 text-right">
                  <span className="text-[12px] font-bold text-gray-900 tabular-nums">
                    {formatCurrency(Number(p.promisedAmount))}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className={`text-[11px] font-medium ${isPast ? "text-red-600" : "text-gray-700"}`}>
                    {fmtDate(p.promiseDate)}
                  </div>
                  {daysOverdue > 0 && (
                    <div className={`text-[10px] font-semibold ${daysOverdue > 30 ? "text-red-600" : "text-amber-600"}`}>
                      {daysOverdue} ditë vonesë
                    </div>
                  )}
                </td>
                <td className="py-2 px-3">
                  {statusCfg ? (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  ) : <span className="text-[11px] text-gray-500">{p.status}</span>}
                </td>
                <td className="py-2 px-3">
                  <span className="text-[11px] text-gray-500 truncate max-w-[200px] block">{p.notes ?? "—"}</span>
                </td>
                <td className="py-2 px-3">
                  {p.case?.id && (
                    <Link href={`/cases/${p.case.id}`} onClick={e => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={13} className="text-brand-500" />
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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

type Tab = "cases" | "promises" | "overdue" | "broken" | "activities";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "cases",      label: "Klientët",    icon: Users },
  { key: "promises",   label: "Premtimet",   icon: CheckCircle },
  { key: "overdue",    label: "Vonesat",     icon: AlertTriangle },
  { key: "broken",     label: "Dështimet",   icon: XCircle },
  { key: "activities", label: "Aktivitetet", icon: Activity },
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

  const badgeFor = (key: Tab) => {
    if (key === "cases")      return cases.length;
    if (key === "promises")   return promises.filter((p: any) => p.status !== "BROKEN" && p.status !== "CANCELLED").length;
    if (key === "overdue")    return overduePromises.length;
    if (key === "broken")     return brokenPromises.length;
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

              {/* Tabs */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center border-b border-gray-100">
                  <div className="flex overflow-x-auto flex-1">
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
                  <button onClick={() => triggerRefresh(() => { mutate(); })}
                    className="p-2 mr-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0">
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  </button>
                </div>
                <div className="min-h-56">
                  {tab === "cases"      && <CasesTab cases={cases} />}
                  {tab === "promises"   && <PromisesTab promises={promises} mode="all" />}
                  {tab === "overdue"    && <PromisesTab promises={promises} mode="overdue" />}
                  {tab === "broken"     && <PromisesTab promises={promises} mode="broken" />}
                  {tab === "activities" && <ActivitiesTab activities={activities} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}
