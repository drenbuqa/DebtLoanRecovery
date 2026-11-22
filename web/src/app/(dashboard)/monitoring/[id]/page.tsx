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
  Activity, CheckCircle, Clock,
  ChevronRight, RefreshCw, Phone, MapPin, MessageSquare,
} from "lucide-react";

// ── Label maps ───────────────────────────────────────────────

const FAZA_LABEL: Record<string, string> = {
  KLIENT_I_RI:            "Klienti i Ri",
  PAKONTAKTUAR:           "I Pakontaktuar",
  ZOTIM_PAGESE:           "Zotim Pagese",
  ME_MARREVESHJE:         "Me Marrëveshje",
  KONTESTIM_BORGJI:       "Kontestim Borgji",
  NUK_PRANON_MARREVESHJE: "Nuk Pranon",
  JURIDIKE:               "Juridike",
  TJERA:                  "Të Tjera",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    "Aktiv",
  CLOSED:    "Mbyllur",
  SUSPENDED: "Pezulluar",
  LEGAL:     "Juridike",
  ANKES:     "Ankesë",
  AKTGJYKIM: "Aktgjykim",
};

const PROMISE_LABEL: Record<string, string> = {
  PENDING: "Në pritje",
  KEPT:    "Mbajtur",
  BROKEN:  "Thyer",
  PARTIAL: "Pjesërisht",
};

const ACT_TYPE_LABEL: Record<string, string> = {
  CALL:                  "Telefonatë",
  CALL_BORROWER:         "Telefonatë (Huamarrës)",
  CALL_GUARANTOR:        "Telefonatë (Garant)",
  VISIT:                 "Vizitë",
  FIELD_VISIT:           "Vizitë në terren",
  VISIT_BORROWER:        "Vizitë (Huamarrës)",
  VISIT_GUARANTOR:       "Vizitë (Garant)",
  MEETING_BORROWER:      "Takim (Huamarrës)",
  MEETING_GUARANTOR:     "Takim (Garant)",
};

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
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ActivityTypeIcon({ type }: { type: string }) {
  if (type.includes("CALL")) return <Phone size={12} />;
  if (type.includes("VISIT") || type.includes("FIELD")) return <MapPin size={12} />;
  return <MessageSquare size={12} />;
}

// ── KPI card — matches dashboard ─────────────────────────────

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
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <Users size={24} className="text-gray-200 mb-2" />
      <p className="text-[13px] text-gray-400">Ky oficer nuk ka klientë të caktuar</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Klienti</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referenca</th>
            <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Borxhi</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Faza</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Statusi</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Veprim i ardhshëm</th>
            <th className="py-2.5 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {cases.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
              <td className="py-2.5 px-4 font-medium text-gray-900 truncate max-w-[180px]">
                {c.loan?.borrower?.fullName ?? "—"}
              </td>
              <td className="py-2.5 px-4">
                <span className="font-mono text-[12px] text-gray-500">{c.caseReference}</span>
              </td>
              <td className="py-2.5 px-4 text-right font-semibold text-gray-900 tabular-nums">
                {formatCurrency(Number(c.loan?.currentOutstandingBalance ?? 0))}
              </td>
              <td className="py-2.5 px-4">
                <span className="text-[12px] text-gray-700">
                  {c.collectionStatus ? (FAZA_LABEL[c.collectionStatus] ?? c.collectionStatus) : "—"}
                </span>
              </td>
              <td className="py-2.5 px-4">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  c.status === "ACTIVE" ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </td>
              <td className="py-2.5 px-4">
                {c.nextActionDate ? (
                  <div className="text-[12px] text-gray-600">{fmtDate(c.nextActionDate)}</div>
                ) : <span className="text-[12px] text-gray-300">—</span>}
              </td>
              <td className="py-2.5 px-4">
                <Link href={`/cases/${c.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={13} className="text-brand-500" />
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
    ? promises.filter((p: any) => p.status === "PENDING" && new Date(p.promiseDate) < now)
    : promises;

  if (list.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <CheckCircle size={24} className="text-gray-200 mb-2" />
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
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Klienti</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referenca</th>
            <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Shuma</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Data</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Statusi</th>
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Shënim</th>
            <th className="py-2.5 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {list.map((p: any) => {
            const isPast = p.status === "PENDING" && new Date(p.promiseDate) < now;
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                <td className="py-2.5 px-4 font-medium text-gray-900 truncate max-w-[180px]">
                  {p.case?.loan?.borrower?.fullName ?? "—"}
                </td>
                <td className="py-2.5 px-4">
                  <span className="font-mono text-[12px] text-gray-500">{p.case?.caseReference ?? "—"}</span>
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-gray-900 tabular-nums">
                  {formatCurrency(Number(p.promisedAmount))}
                </td>
                <td className="py-2.5 px-4">
                  <span className={`text-[12px] ${isPast ? "text-red-600 font-medium" : "text-gray-700"}`}>
                    {fmtDate(p.promiseDate)}{isPast && " ⚠"}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <span className="text-[12px] text-gray-600">{PROMISE_LABEL[p.status] ?? p.status}</span>
                </td>
                <td className="py-2.5 px-4">
                  <span className="text-[12px] text-gray-500 truncate max-w-[180px] block">{p.notes ?? "—"}</span>
                </td>
                <td className="py-2.5 px-4">
                  {p.case?.id && (
                    <Link href={`/cases/${p.case.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
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

// ── Activities tab — compact rows ────────────────────────────

function ActivitiesTab({ activities }: { activities: any[] }) {
  if (activities.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <Activity size={24} className="text-gray-200 mb-2" />
      <p className="text-[13px] text-gray-400">Nuk ka aktivitete të regjistruara</p>
    </div>
  );

  return (
    <div className="divide-y divide-gray-50">
      {activities.map((a: any) => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
            <ActivityTypeIcon type={a.activityType} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-medium text-gray-800">
                {ACT_TYPE_LABEL[a.activityType] ?? a.activityType.replace(/_/g, " ")}
              </span>
              <span className="text-[11px] text-gray-400">
                {a.case?.loan?.borrower?.fullName ?? "—"} · {a.case?.caseReference ?? "—"}
              </span>
              {a.outcome && (
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {a.outcome}
                </span>
              )}
              {a.promiseAmount && (
                <span className="text-[10px] text-gray-600 font-medium">
                  {formatCurrency(Number(a.promiseAmount))}
                </span>
              )}
            </div>
            {a.notes && (
              <div className="text-[11px] text-gray-500 truncate mt-0.5">{a.notes}</div>
            )}
          </div>
          <div className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">{fmtDateTime(a.occurredAt)}</div>
          <Link href={`/cases/${a.case?.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <ChevronRight size={13} className="text-brand-500" />
          </Link>
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

  const officer    = data?.officer;
  const stats      = data?.stats;
  const cases      = data?.cases ?? [];
  const promises   = data?.promises ?? [];
  const activities = data?.recentActivities ?? [];

  const now = new Date();
  const overduePromises = promises.filter((p: any) => p.status === "PENDING" && new Date(p.promiseDate) < now);

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
                <button onClick={() => mutate()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer shrink-0">
                  <RefreshCw size={12} />
                  Rifresko
                </button>
              </div>

              {/* Stats — same KpiCard as dashboard */}
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
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {TABS.map(({ key, label, icon: Icon }) => {
                    const badge = key === "cases" ? cases.length
                      : key === "promises" ? promises.length
                      : key === "overdue" ? overduePromises.length
                      : activities.length;
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
                              : key === "overdue" ? "bg-red-100 text-red-600"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {badge > 999 ? "999+" : badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="min-h-56">
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
