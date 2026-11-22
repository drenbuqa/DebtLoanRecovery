"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { AccessGuard } from "@/components/AccessGuard";
import { formatCurrency } from "@/lib/utils";
import { monitoring as monitoringApi } from "@/lib/api";
import {
  ArrowLeft, Users, TrendingUp, AlertTriangle,
  Activity, CheckCircle, XCircle, Clock,
  ChevronRight, RefreshCw, CalendarDays, Banknote,
  MessageSquare, Phone, MapPin,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STAGE_COLORS: Record<string, string> = {
  D1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  D2: "bg-amber-50 text-amber-700 border-amber-200",
  D3: "bg-orange-50 text-orange-700 border-orange-200",
  D4: "bg-red-50 text-red-700 border-red-200",
  LEGAL: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      "bg-emerald-50 text-emerald-700",
  CLOSED:      "bg-gray-100 text-gray-500",
  SUSPENDED:   "bg-blue-50 text-blue-700",
  LEGAL:       "bg-purple-50 text-purple-700",
  ANKES:       "bg-orange-50 text-orange-700",
  AKTGJYKIM:   "bg-red-50 text-red-700",
};

const PROMISE_COLORS: Record<string, string> = {
  PENDING:   "bg-blue-50 text-blue-700",
  KEPT:      "bg-emerald-50 text-emerald-700",
  BROKEN:    "bg-red-50 text-red-700",
  PARTIAL:   "bg-amber-50 text-amber-700",
};

const PROMISE_LABELS: Record<string, string> = {
  PENDING: "Në pritje",
  KEPT:    "Mbajtur",
  BROKEN:  "Thyer",
  PARTIAL: "Pjesërisht",
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  CALL: Phone, CALL_BORROWER: Phone, CALL_GUARANTOR: Phone,
  VISIT: MapPin, FIELD_VISIT: MapPin, VISIT_BORROWER: MapPin,
  MEETING_BORROWER: MessageSquare, MEETING_GUARANTOR: MessageSquare,
};

function ActivityIcon({ type }: { type: string }) {
  const Icon = ACTIVITY_ICON[type] ?? Activity;
  return <Icon size={13} />;
}

// ── Stat card ────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className={`text-[20px] font-bold tabular-nums leading-none ${accent ?? "text-gray-900"}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Tab types ────────────────────────────────────────────────

type Tab = "cases" | "promises" | "activities" | "overdue";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "cases",      label: "Klientët",    icon: Users },
  { key: "promises",   label: "Premtimet",   icon: CheckCircle },
  { key: "overdue",    label: "Vonesat",     icon: AlertTriangle },
  { key: "activities", label: "Aktivitetet", icon: Activity },
];

// ── Cases tab ────────────────────────────────────────────────

function CasesTab({ cases }: { cases: any[] }) {
  if (cases.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users size={28} className="text-gray-200 mb-3" />
      <p className="text-[13px] text-gray-400">Ky oficer nuk ka klientë të caktuar</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Klienti</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referenca</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Borxhi</th>
            <th className="text-center py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Faza</th>
            <th className="text-center py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Statusi</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Veprim i ardhshëm</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {cases.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
              <td className="py-3 px-4">
                <div className="font-medium text-gray-900 truncate max-w-[180px]">
                  {c.loan?.borrower?.fullName ?? "—"}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="font-mono text-[12px] text-gray-600">{c.caseReference}</span>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-gray-900 tabular-nums">
                {formatCurrency(Number(c.loan?.currentOutstandingBalance ?? 0))}
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STAGE_COLORS[c.collectionStage] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {c.collectionStage}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {c.status === "ACTIVE" ? "Aktiv" : c.status}
                </span>
              </td>
              <td className="py-3 px-4">
                {c.nextActionDate ? (
                  <div>
                    <div className="text-[12px] text-gray-700">{fmtDate(c.nextActionDate)}</div>
                    {c.nextActionNote && <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{c.nextActionNote}</div>}
                  </div>
                ) : (
                  <span className="text-[12px] text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <Link href={`/cases/${c.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-brand-500" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Promises tab ─────────────────────────────────────────────

function PromisesTab({ promises, overdue = false }: { promises: any[]; overdue?: boolean }) {
  const now = new Date();
  const list = overdue
    ? promises.filter(p => p.status === "PENDING" && new Date(p.promiseDate) < now)
    : promises;

  if (list.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckCircle size={28} className="text-gray-200 mb-3" />
      <p className="text-[13px] text-gray-400">
        {overdue ? "Nuk ka premtime të vonuara" : "Nuk ka premtime të regjistruara"}
      </p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Klienti</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referenca</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Shuma</th>
            <th className="text-center py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Data premtimit</th>
            <th className="text-center py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Statusi</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Shënim</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {list.map((p: any) => {
            const isPast = p.status === "PENDING" && new Date(p.promiseDate) < now;
            return (
              <tr key={p.id} className={`hover:bg-gray-50 transition-colors group ${isPast ? "bg-red-50/30" : ""}`}>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900 truncate max-w-[180px]">
                    {p.case?.loan?.borrower?.fullName ?? "—"}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-[12px] text-gray-600">{p.case?.caseReference ?? "—"}</span>
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900 tabular-nums">
                  {formatCurrency(Number(p.promisedAmount))} {p.currency}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-[12px] font-medium ${isPast ? "text-red-600" : "text-gray-700"}`}>
                    {fmtDate(p.promiseDate)}
                    {isPast && <span className="ml-1 text-[10px]">(!)</span>}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${PROMISE_COLORS[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {PROMISE_LABELS[p.status] ?? p.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[12px] text-gray-500 truncate max-w-[180px] block">{p.notes ?? "—"}</span>
                </td>
                <td className="py-3 px-4">
                  {p.case?.id && (
                    <Link href={`/cases/${p.case.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={14} className="text-brand-500" />
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

// ── Activities tab ───────────────────────────────────────────

function ActivitiesTab({ activities }: { activities: any[] }) {
  if (activities.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Activity size={28} className="text-gray-200 mb-3" />
      <p className="text-[13px] text-gray-400">Nuk ka aktivitete të regjistruara</p>
    </div>
  );

  return (
    <div className="divide-y divide-gray-50">
      {activities.map((a: any) => (
        <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
          <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-brand-600"><ActivityIcon type={a.activityType} /></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-semibold text-gray-700">
                {a.activityType.replace(/_/g, " ")}
              </span>
              {a.channel && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{a.channel}</span>
              )}
              {a.outcome && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  a.outcome === "PROMISE" ? "bg-blue-50 text-blue-700" :
                  a.outcome === "PAYMENT" ? "bg-emerald-50 text-emerald-700" :
                  "bg-gray-100 text-gray-500"
                }`}>{a.outcome}</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 truncate">
              {a.case?.loan?.borrower?.fullName ?? "—"} · {a.case?.caseReference ?? "—"}
            </div>
            {a.notes && <div className="text-[12px] text-gray-600 mt-1 leading-relaxed line-clamp-2">{a.notes}</div>}
            {a.promiseAmount && (
              <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                Premtim: {formatCurrency(Number(a.promiseAmount))}
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-400 shrink-0 text-right whitespace-nowrap">
            {fmtDateTime(a.occurredAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function OfficerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>("cases");

  const { data, isLoading, mutate } = useSWR(
    id ? ["monitoring-officer", id] : null,
    () => monitoringApi.officerDetail(id),
    { revalidateOnFocus: false },
  );

  const officer   = data?.officer;
  const stats     = data?.stats;
  const cases     = data?.cases ?? [];
  const promises  = data?.promises ?? [];
  const activities = data?.recentActivities ?? [];

  const now = new Date();
  const overduePromises = promises.filter((p: any) => p.status === "PENDING" && new Date(p.promiseDate) < now);

  return (
    <AccessGuard permission="page:monitoring">
      <div className="min-h-screen bg-gray-50">
        <Topbar title={officer?.fullName ?? "Duke ngarkuar…"} subtitle={officer?.office?.name ?? ""} />

        <div className="p-4 md:p-6">
          {/* Back + header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => router.push("/monitoring")}
              className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={14} />
              Kthehu
            </button>
            <div className="text-gray-200">/</div>
            <span className="text-[13px] font-medium text-gray-700">{officer?.fullName}</span>
          </div>

          {isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
              </div>
              <div className="h-96 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            </div>
          )}

          {!isLoading && data && (
            <>
              {/* Officer identity card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 flex items-center gap-4"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-brand-700 text-[16px] font-bold">{initials(officer?.fullName ?? "")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-bold text-gray-900">{officer?.fullName}</div>
                  <div className="text-[13px] text-gray-500 mt-0.5">
                    {officer?.office?.name ?? "Pa zyrë"} · #{officer?.userCode ?? "—"} · {officer?.role}
                  </div>
                </div>
                <button onClick={() => mutate()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
                  <RefreshCw size={13} />
                  Rifresko
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
                <StatCard label="Klientë aktiv"       value={stats.activeCases}           />
                <StatCard label="Portofoli total"      value={formatCurrency(stats.totalBalance)} />
                <StatCard label="Premtime hapura"      value={stats.promisesPending}        accent={stats.promisesPending > 0 ? "text-blue-600" : undefined} />
                <StatCard label="Premtime vonuara"     value={stats.promisesOverdue}        accent={stats.promisesOverdue > 0 ? "text-red-600" : undefined} />
                <StatCard label="Premtime të mbajtura" value={stats.promisesKept}           accent="text-emerald-600" />
                <StatCard label="Aktivitete (muaj)"    value={stats.activitiesThisMonth}   />
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                {/* Tab bar */}
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {TABS.map(({ key, label, icon: Icon }) => {
                    const badge = key === "cases" ? cases.length
                      : key === "promises" ? promises.length
                      : key === "overdue" ? overduePromises.length
                      : activities.length;
                    return (
                      <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-5 py-3.5 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
                          tab === key
                            ? "border-brand-600 text-brand-700"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <Icon size={14} />
                        {label}
                        {badge > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            tab === key
                              ? "bg-brand-100 text-brand-700"
                              : key === "overdue"
                              ? "bg-red-100 text-red-600"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {badge > 999 ? "999+" : badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="min-h-64">
                  {tab === "cases"      && <CasesTab cases={cases} />}
                  {tab === "promises"   && <PromisesTab promises={promises} />}
                  {tab === "overdue"    && <PromisesTab promises={promises} overdue />}
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
