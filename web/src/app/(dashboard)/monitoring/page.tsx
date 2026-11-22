"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { AccessGuard } from "@/components/AccessGuard";
import { formatCurrency } from "@/lib/utils";
import { monitoring as monitoringApi, offices as officesApi } from "@/lib/api";
import {
  Eye, AlertTriangle, RefreshCw, ChevronRight,
  Users, TrendingUp, Clock, Activity, Search,
} from "lucide-react";
import { Select } from "@/components/ui/Select";

// ── Helpers ──────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function relativeDate(d: string | Date | null): string {
  if (!d) return "Asnjëherë";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m më parë`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h më parë`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Dje";
  if (days < 7) return `${days} ditë më parë`;
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" });
}

function StatPill({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className={`text-[15px] font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-gray-400 leading-tight text-center whitespace-nowrap">{label}</span>
    </div>
  );
}

// ── Officer card ─────────────────────────────────────────────

function OfficerCard({ o, onClick }: { o: any; onClick: () => void }) {
  const alertLevel = o.promisesOverdue > 5 ? "high" : o.promisesOverdue > 1 ? "medium" : "none";

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-brand-300 hover:shadow-md transition-all group"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-brand-700 text-[13px] font-bold">{initials(o.fullName)}</span>
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-gray-900 truncate">{o.fullName}</div>
            <div className="text-[11px] text-gray-400 mt-0.5 truncate">
              {o.office?.name ?? "Pa zyrë"} · #{o.userCode ?? "—"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {alertLevel !== "none" && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
              alertLevel === "high" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
            }`}>
              <AlertTriangle size={10} />
              {o.promisesOverdue} vonuar
            </div>
          )}
          <ChevronRight size={15} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
        </div>
      </div>

      {/* Portfolio balance */}
      <div className="mb-4">
        <div className="text-[11px] text-gray-400 mb-0.5">Portofoli aktiv</div>
        <div className="text-[18px] font-bold text-gray-900 tabular-nums">
          {formatCurrency(o.portfolioBalance)}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <StatPill value={o.activeCases}          label="Klientë aktiv"   color="text-gray-800" />
        <div className="w-px h-6 bg-gray-100" />
        <StatPill value={o.promisesPending}       label="Premtime hapura" color={o.promisesPending > 0 ? "text-blue-600" : "text-gray-800"} />
        <div className="w-px h-6 bg-gray-100" />
        <StatPill value={o.activitiesThisMonth}   label="Aktivitete/muaj" color="text-gray-800" />
        <div className="w-px h-6 bg-gray-100" />
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[11px] font-medium text-gray-500 truncate">{relativeDate(o.lastActivityAt)}</span>
          <span className="text-[10px] text-gray-400 leading-tight">Aktiviteti i fundit</span>
        </div>
      </div>
    </button>
  );
}

// ── Summary bar ───────────────────────────────────────────────

function SummaryBar({ officers }: { officers: any[] }) {
  const totalPortfolio  = officers.reduce((s, o) => s + o.portfolioBalance, 0);
  const totalCases      = officers.reduce((s, o) => s + o.activeCases, 0);
  const totalOverdue    = officers.reduce((s, o) => s + o.promisesOverdue, 0);
  const totalActivities = officers.reduce((s, o) => s + o.activitiesThisMonth, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Oficerrë aktiv",        value: officers.length,              icon: Users,      color: "bg-brand-50 text-brand-600"  },
        { label: "Portofoli total",        value: formatCurrency(totalPortfolio), icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
        { label: "Klientë aktiv (total)",  value: totalCases,                   icon: Eye,        color: "bg-blue-50 text-blue-600"    },
        { label: "Premtime të vonuara",    value: totalOverdue,                 icon: AlertTriangle, color: totalOverdue > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            <Icon size={15} />
          </div>
          <div>
            <div className="text-[18px] font-bold text-gray-900 tabular-nums leading-none">{value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function MonitoringPage() {
  const router = useRouter();
  const [officeId, setOfficeId] = useState("");
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState<"name" | "cases" | "portfolio" | "overdue" | "activity">("overdue");

  const { data: officers = [], isLoading, mutate } = useSWR(
    ["monitoring-officers", officeId],
    () => monitoringApi.officers(officeId || undefined),
    { revalidateOnFocus: false },
  );

  const { data: officeList = [] } = useSWR("offices-all", () => officesApi.list(), { revalidateOnFocus: false });

  const filtered = useMemo(() => {
    let list = [...officers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => o.fullName.toLowerCase().includes(q) || o.office?.name?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "name")      return a.fullName.localeCompare(b.fullName);
      if (sortBy === "cases")     return b.activeCases - a.activeCases;
      if (sortBy === "portfolio") return b.portfolioBalance - a.portfolioBalance;
      if (sortBy === "overdue")   return b.promisesOverdue - a.promisesOverdue;
      if (sortBy === "activity") {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return tb - ta;
      }
      return 0;
    });
    return list;
  }, [officers, search, sortBy]);

  return (
    <AccessGuard permission="page:monitoring">
      <div className="min-h-screen bg-gray-50">
        <Topbar
          title="Monitorimi"
          subtitle="Shikoni aktivitetin dhe portofolin e secilit oficer"
          help={[
            { title: "Çfarë shfaq kjo faqe?", body: "Pasqyrë e plotë e çdo oficeri: numri i klientëve, bilanci i portofolit, premtimet e hapura dhe vonuara, aktivitetet e muajit." },
            { title: "Cilat janë premtimet e vonuara?", body: "Premtimet ku data e premtimit ka kaluar por pagesa nuk është konfirmuar ende. Sa më i lartë ky numër, aq më shumë kërkon vëmendje ai oficer." },
            { title: "Si të hap profilin e plotë?", body: "Klikoni mbi kartën e çdo oficeri për të parë të gjithë klientët, premtimet, vonesat dhe aktivitetet e tyre." },
          ]}
        />

        <div className="p-4 md:p-6">
          {/* Summary */}
          {!isLoading && officers.length > 0 && <SummaryBar officers={officers} />}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-center"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Kërko oficer…"
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400 transition-colors"
              />
            </div>

            {/* Office filter */}
            <Select
              value={officeId}
              onChange={setOfficeId}
              className="w-44"
              placeholder="Të gjitha zyret"
              clearable
              options={officeList.map((o: any) => ({ value: o.id, label: o.name }))}
            />

            {/* Sort */}
            <Select
              value={sortBy}
              onChange={v => setSortBy(v as any)}
              className="w-48"
              options={[
                { value: "overdue",    label: "Sipas vonuara ↓" },
                { value: "portfolio",  label: "Sipas portofolit ↓" },
                { value: "cases",      label: "Sipas klientëve ↓" },
                { value: "activity",   label: "Sipas aktivitetit të fundit" },
                { value: "name",       label: "Sipas emrit" },
              ]}
            />

            <button onClick={() => mutate()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCw size={13} />
              Rifresko
            </button>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse h-48" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
              <Users size={28} className="text-gray-200 mb-3" />
              <p className="text-[13px] font-medium text-gray-400">Nuk u gjetën oficerë</p>
              <p className="text-[12px] text-gray-300 mt-1">Ndryshoni filtrin ose rifreskoni</p>
            </div>
          )}

          {/* Grid */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(o => (
                <OfficerCard key={o.id} o={o} onClick={() => router.push(`/monitoring/${o.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}
