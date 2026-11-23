"use client";

import { useState, useMemo, useCallback } from "react";
import { useRefreshing } from "@/lib/useRefreshing";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { AccessGuard } from "@/components/AccessGuard";
import { formatCurrency } from "@/lib/utils";
import { monitoring as monitoringApi, offices as officesApi } from "@/lib/api";
import { Select } from "@/components/ui/Select";
import {
  Eye, AlertTriangle, RefreshCw, ChevronRight,
  Users, TrendingUp, Search,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function relativeDate(d: string | Date | null): string {
  if (!d) return "Asnjëherë";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Dje";
  if (days < 7) return `${days} ditë`;
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" });
}

// ── KPI card — matches dashboard style exactly ────────────────

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

// ── Officer card — compact ────────────────────────────────────

function OfficerCard({ o, onClick }: { o: any; onClick: () => void }) {
  const hasOverdue = o.promisesOverdue > 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-gray-200 px-4 py-3.5 text-left hover:border-brand-300 hover:shadow-sm transition-all group cursor-pointer"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <span className="text-gray-600 text-[11px] font-bold">{initials(o.fullName)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{o.fullName}</div>
          <div className="text-[11px] text-gray-400 truncate">{o.office?.name ?? "Pa zyrë"} · #{o.userCode ?? "—"}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasOverdue && (
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              {o.promisesOverdue} von.
            </span>
          )}
          <ChevronRight size={13} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
        </div>
      </div>

      <div className="text-[16px] font-bold text-gray-900 tabular-nums mb-3">
        {formatCurrency(o.portfolioBalance)}
      </div>

      <div className="flex items-center gap-4 pt-2.5 border-t border-gray-50 text-[11px]">
        <div>
          <span className="font-semibold text-gray-800">{o.activeCases}</span>
          <span className="text-gray-400 ml-1">klientë</span>
        </div>
        <div>
          <span className={`font-semibold ${o.promisesPending > 0 ? "text-gray-800" : "text-gray-400"}`}>{o.promisesPending}</span>
          <span className="text-gray-400 ml-1">premtime</span>
        </div>
        <div>
          <span className="font-semibold text-gray-800">{o.activitiesThisMonth}</span>
          <span className="text-gray-400 ml-1">akt./muaj</span>
        </div>
        <div className="ml-auto text-gray-400">{relativeDate(o.lastActivityAt)}</div>
      </div>
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function MonitoringPage() {
  const router = useRouter();
  const [officeId, setOfficeId] = useState("");
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState<"cases" | "portfolio" | "activity" | "">("");
  const [refreshing, triggerRefresh] = useRefreshing();

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
      if (sortBy === "cases")     return b.activeCases - a.activeCases;
      if (sortBy === "portfolio") return b.portfolioBalance - a.portfolioBalance;
      if (sortBy === "activity") {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return tb - ta;
      }
      return 0;
    });
    return list;
  }, [officers, search, sortBy]);

  const totalPortfolio  = officers.reduce((s: number, o: any) => s + o.portfolioBalance, 0);
  const totalCases      = officers.reduce((s: number, o: any) => s + o.activeCases, 0);
  const totalOverdue    = officers.reduce((s: number, o: any) => s + o.promisesOverdue, 0);

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
          {/* KPI summary */}
          {!isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <KpiCard label="Oficerë aktiv"       value={officers.length} icon={Users} />
              <KpiCard label="Portofoli total"      value={formatCurrency(totalPortfolio)} icon={TrendingUp} />
              <KpiCard label="Klientë aktiv"        value={totalCases} icon={Eye} />
              <KpiCard label="Premtime të vonuara"  value={totalOverdue} icon={AlertTriangle} urgent={totalOverdue > 0} />
            </div>
          )}

          {/* Filters — bare row, no container */}
          <div className="flex flex-wrap gap-2.5 items-center mb-4">
            <div className="relative flex-1 min-w-48 max-w-72 shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Kërko oficer…"
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400 transition-colors"
              />
            </div>
            <Select
              value={officeId}
              onChange={setOfficeId}
              className="w-44"
              placeholder="Të gjitha zyret"
              clearable
              options={officeList.map((o: any) => ({ value: o.id, label: o.name }))}
            />
            <Select
              value={sortBy}
              onChange={v => setSortBy(v as any)}
              className="w-52"
              placeholder="Rendit sipas…"
              clearable
              options={[
                { value: "portfolio", label: "Portofoli (më i madh)" },
                { value: "cases",     label: "Klientë aktivë (më shumë)" },
                { value: "activity",  label: "Aktiviteti i fundit (më i ri)" },
              ]}
            />
            <div className="flex-1" />
            <button onClick={() => triggerRefresh(() => { mutate(); })}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-36" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
              <Users size={24} className="text-gray-200 mb-3" />
              <p className="text-[13px] text-gray-400">Nuk u gjetën oficerë</p>
            </div>
          )}

          {/* Grid */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
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
