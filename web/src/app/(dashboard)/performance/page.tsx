"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Topbar from "@/components/layout/Topbar";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";
import { performance as perfApi, offices as officesApi, cases as casesApi } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AccessGuard } from "@/components/AccessGuard";
import { Select } from "@/components/ui/Select";
import { DatePresetPicker, DatePreset, presetToRange, PERFORMANCE_PRESETS } from "@/components/ui/DatePresetPicker";
import { CollectionsChart } from "@/components/charts/CollectionsChart";
import { ActivityTrendChart } from "@/components/charts/ActivityTrendChart";

// ── Officer table ────────────────────────────────────────────────────────────

function OfficerTable({ officers, role }: { officers: any[]; role: "primary" | "secondary" }) {
  const rows = [...officers]
    .map((o) => ({ ...o, stats: o[role] }))
    .sort((a, b) => b.stats.collectedAmount - a.stats.collectedAmount);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <Table>
        <Thead>
          <tr>
            <Th>Oficer</Th>
            <Th>Zyrë</Th>
            <Th>Portofoli</Th>
            <Th>Klient Aktive</Th>
            <Th>Telefonata</Th>
            <Th>Vizita</Th>
            <Th>Premtime</Th>
            <Th>Shuma e Premtimit</Th>
            <Th>I Mbledhur</Th>
            <Th>Mbledhur/Portfolio %</Th>
          </tr>
        </Thead>
        <Tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={10} className="text-center py-8 text-gray-400 text-[13px]">
              Nuk ka të dhëna për periudhën e zgjedhur
            </td></tr>
          ) : rows.map((o) => {
            const s = o.stats;
            return (
              <Tr key={o.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-brand-700 text-[10px] font-bold">
                        {o.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{o.fullName}</span>
                  </div>
                </Td>
                <Td><span className="text-gray-500">{o.office?.name ?? "—"}</span></Td>
                <Td><span className="tabular text-gray-700 font-medium">{formatCurrency(s.portfolio ?? 0)}</span></Td>
                <Td><span className="tabular text-gray-700 font-medium">{s.activeCases}</span></Td>
                <Td><span className="tabular text-gray-700">{s.calls}</span></Td>
                <Td><span className="tabular text-gray-700">{s.visits}</span></Td>
                <Td><span className="tabular text-gray-700">{s.promises}</span></Td>
                <Td><span className="tabular text-gray-600">{formatCurrency(s.promiseAmount)}</span></Td>
                <Td>
                  <span className={`tabular font-semibold ${s.collectedAmount > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                    {formatCurrency(s.collectedAmount)}
                  </span>
                </Td>
                <Td>
                  {s.collectionRate !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(s.collectionRate, 100)}%` }} />
                      </div>
                      <span className="text-[12px] text-gray-600 tabular">{s.collectionRate}%</span>
                    </div>
                  ) : s.activeCases > 0 && s.collectedAmount === 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400 rounded-full" style={{ width: "0%" }} />
                      </div>
                      <span className="text-[12px] text-gray-400 tabular">0%</span>
                    </div>
                  ) : <span className="text-gray-300">—</span>}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
}

// ── Table skeleton ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
          <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 h-3 bg-gray-100 animate-pulse rounded" style={{ width: `${40 + (i % 3) * 15}%` }} />
          <div className="w-16 h-3 bg-gray-100 animate-pulse rounded" />
          <div className="w-12 h-3 bg-gray-100 animate-pulse rounded" />
          <div className="w-20 h-3 bg-gray-100 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Chart skeleton ────────────────────────────────────────────────────────────

function ChartSkeleton({ bars = 12 }: { bars?: number }) {
  return (
    <div className="w-full h-full animate-pulse bg-gray-50 rounded-lg flex items-end justify-around px-4 pb-4 gap-1.5" style={{ minHeight: 180 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} className="flex-1 bg-gray-200 rounded-t"
          style={{ height: `${25 + (i % 5) * 11}%`, opacity: 0.4 + (i % 3) * 0.18 }} />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function PerformancePageInner() {
  const { user } = useAuth();
  const isOfficer = user?.role === "OFFICER";
  const isManager = user?.role === "MANAGER";
  const isAdmin   = user?.role === "ADMIN";

  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = now.getMonth();
  const currentMonth = `${yr}-${String(mo + 1).padStart(2, "0")}`;

  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom,   setDateFrom]   = useState(() => presetToRange("month").from);
  const [dateTo,     setDateTo]     = useState(() => presetToRange("month").to);
  const [officeFilter, setOfficeFilter] = useState("");
  const [roleTab, setRoleTab] = useState<"primary" | "secondary">("primary");

  // ── Officers + offices ──
  const swrKey = useMemo(
    () => ["performance", dateFrom, dateTo, officeFilter, isAdmin, isManager, isOfficer],
    [dateFrom, dateTo, officeFilter, isAdmin, isManager, isOfficer],
  );

  const { data: perfData, error, isLoading: loading, isValidating: refreshing, mutate } = useSWR(
    swrKey,
    async () => {
      const params: any = { from: dateFrom, to: dateTo };
      if (!isOfficer && officeFilter) params.officeId = officeFilter;
      const [o, off] = await Promise.all([
        perfApi.officers(params),
        (isAdmin || isManager) ? officesApi.list() : Promise.resolve([]),
      ]);
      return { officers: o, offices: off };
    },
    { keepPreviousData: true },
  );

  // ── Activity trend ──
  const trendKey = useMemo(
    () => ["perf-trend", dateFrom, dateTo, officeFilter, isOfficer ? user?.id : null],
    [dateFrom, dateTo, officeFilter, isOfficer, user?.id],
  );

  const { data: trendData, isLoading: trendLoading } = useSWR(
    trendKey,
    () => {
      const params: any = { from: dateFrom, to: dateTo };
      if (!isOfficer && officeFilter) params.officeId = officeFilter;
      return perfApi.activityTrend(params);
    },
    { keepPreviousData: true },
  );

  // ── Monthly chart (managers/admins only) ──
  const { data: chartStats, isLoading: chartLoading } = useSWR(
    (isAdmin || isManager) ? ["perf-monthly-chart", isAdmin ? undefined : user?.officeId] : null,
    () => casesApi.dashboardStats(isAdmin ? undefined : user?.officeId),
  );

  const allMonths = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, "0")}`), [yr]);

  const monthlyData = useMemo(() => {
    const m: Record<string, number> = {};
    for (const x of (chartStats?.monthlyCollections ?? [])) m[x.month] = x.total;
    return allMonths.map((month) => ({ month, total: m[month] ?? 0 }));
  }, [chartStats?.monthlyCollections, allMonths]);

  const officers = perfData?.officers ?? [];
  const offices  = perfData?.offices  ?? [];

  const activeStats     = officers.map((o: any) => o[roleTab] ?? {});
  const totalCollected  = activeStats.reduce((s: number, o: any) => s + (o.collectedAmount ?? 0), 0);
  const totalActivities = activeStats.reduce((s: number, o: any) => s + (o.totalActivities ?? 0), 0);
  const totalCalls      = activeStats.reduce((s: number, o: any) => s + (o.calls ?? 0), 0);
  const totalVisits     = activeStats.reduce((s: number, o: any) => s + (o.visits ?? 0), 0);

  const fmtShort = (v: number) => {
    if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000) return `€${(v / 1_000).toFixed(0)}k`;
    if (v >= 1_000) return `€${(v / 1_000).toFixed(1)}k`;
    return `€${v}`;
  };

  const trendBuckets = trendData?.buckets ?? [];
  const trendMode    = trendData?.mode ?? "month";
  const trendLabel   = trendMode === "day" ? "Ditore" : trendMode === "week" ? "Javore" : "Mujore";

  return (
    <div className="flex flex-col">
      <Topbar title="Performanca" subtitle="KPI-të e oficerëve dhe zyrave" />
      <div className="p-4 md:p-6 space-y-4">

        {/* 1. Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <DatePresetPicker
            label="Periudha"
            value={datePreset}
            presets={PERFORMANCE_PRESETS}
            onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); }}
          />
          {(isAdmin || isManager) && (
            <div className="w-44 md:w-52">
              <Select
                label="Zyra"
                value={officeFilter}
                onChange={setOfficeFilter}
                placeholder="Të gjitha"
                clearable
                options={offices.map((o: any) => ({ value: o.id, label: o.name }))}
              />
            </div>
          )}
          <button onClick={() => mutate()} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-auto">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* 2. KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { label: isOfficer ? "Klientë Aktive" : "Oficerë Aktive", value: loading ? "—" : isOfficer ? (officers[0]?.[roleTab]?.activeCases ?? 0) : officers.length },
            { label: "Telefonata",  value: loading ? "—" : totalCalls.toLocaleString() },
            { label: "Vizita",      value: loading ? "—" : totalVisits.toLocaleString() },
            { label: "I Mbledhur",  value: loading ? "—" : fmtShort(totalCollected) },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              {loading ? (
                <>
                  <div className="h-2 bg-gray-100 animate-pulse rounded w-24 mb-2" />
                  <div className="h-6 bg-gray-100 animate-pulse rounded w-16" />
                </>
              ) : (
                <>
                  <div className="text-[10.5px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</div>
                  <div className="text-[19px] font-bold text-gray-900 tabular leading-tight mt-1">{s.value}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* 3. Charts */}
        <div className={`grid gap-4 ${(isAdmin || isManager) ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>

          {/* Activity trend line (all roles) */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">Aktivitet — {trendLabel}</h3>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Gjithsej aktivitete sipas periudhës</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
                <span>Aktivitete totale</span>
              </div>
            </div>
            <div className="px-3 pb-3" style={{ height: 260 }}>
              {trendLoading
                ? <ChartSkeleton bars={trendBuckets.length || 8} />
                : <ActivityTrendChart buckets={trendBuckets} mode={trendMode} />}
            </div>
          </div>

          {/* Monthly collections — managers/admins only */}
          {(isAdmin || isManager) && (
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="flex items-start justify-between px-5 pt-4 pb-2">
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-900">Arkëtime Mujore {yr}</h3>
                  <p className="text-[11.5px] text-gray-400 mt-0.5">Para të arkëtuara — EUR</p>
                </div>
                {chartStats && (
                  <div className="text-right">
                    <div className="text-[10.5px] text-gray-400 uppercase tracking-wide">Këtë muaj</div>
                    <div className="text-[17px] font-bold text-gray-900 tabular leading-none mt-0.5">
                      {fmtShort(monthlyData[mo]?.total ?? 0)}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-3 pb-3 flex-1" style={{ minHeight: 200 }}>
                {chartLoading
                  ? <ChartSkeleton bars={12} />
                  : <CollectionsChart data={monthlyData} currentMonth={currentMonth} />}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {error?.message ?? String(error)}
          </div>
        )}

        {/* 4. Role tabs + table */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(["primary", "secondary"] as const).map((r) => (
            <button key={r} onClick={() => setRoleTab(r)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                roleTab === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {r === "primary" ? "Primar" : "Sekondar"}
            </button>
          ))}
        </div>

        {loading ? <TableSkeleton /> : <OfficerTable officers={officers} role={roleTab} />}

      </div>
    </div>
  );
}

export default function PerformancePage() {
  return (
    <AccessGuard permission="page:performance">
      <PerformancePageInner />
    </AccessGuard>
  );
}
