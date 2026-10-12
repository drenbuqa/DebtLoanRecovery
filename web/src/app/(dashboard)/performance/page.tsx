"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Topbar from "@/components/layout/Topbar";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";
import { performance as perfApi, offices as officesApi } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AccessGuard } from "@/components/AccessGuard";
import { Select } from "@/components/ui/Select";
import { DatePresetPicker, DatePreset, presetToRange, PERFORMANCE_PRESETS } from "@/components/ui/DatePresetPicker";


function OfficerTable({ officers, role }: { officers: any[]; role: "primary" | "secondary" }) {
  const rows = [...officers]
    .map((o) => ({ ...o, stats: o[role] }))
    .filter((o) => role === "primary" || o.stats.activeCases > 0)
    .sort((a, b) => b.stats.collectedAmount - a.stats.collectedAmount);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
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
              {role === "secondary" ? "Asnjë oficer nuk ka klientë sekondarë" : "Nuk ka të dhëna për periudhën e zgjedhur"}
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

function PerformancePageInner() {
  const { user } = useAuth();
  const isOfficer = user?.role === "OFFICER";
  const isManager = user?.role === "MANAGER";
  const isAdmin = user?.role === "ADMIN";

  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(() => presetToRange("month").from);
  const [dateTo,   setDateTo]   = useState(() => presetToRange("month").to);
  const [officeFilter, setOfficeFilter] = useState("");
  const [roleTab, setRoleTab] = useState<"primary" | "secondary">("primary");

  const swrKey = useMemo(() => ['performance', dateFrom, dateTo, officeFilter, isAdmin, isManager, isOfficer], [dateFrom, dateTo, officeFilter, isAdmin, isManager, isOfficer]);

  const { data: perfData, error, isLoading: loading, isValidating: refreshing, mutate } = useSWR(
    swrKey,
    async () => {
      const officerParams: any = { from: dateFrom, to: dateTo };
      if (!isOfficer && officeFilter) officerParams.officeId = officeFilter;
      const [o, off] = await Promise.all([
        perfApi.officers(officerParams),
        (isAdmin || isManager) ? officesApi.list() : Promise.resolve([]),
      ]);
      return { officers: o, offices: off };
    },
    { keepPreviousData: true },
  );

  const officers = perfData?.officers ?? [];
  const offices  = perfData?.offices  ?? [];

  const activeStats = officers.map((o: any) => o[roleTab] ?? {});
  const totalCollected  = activeStats.reduce((s: number, o: any) => s + (o.collectedAmount ?? 0), 0);
  const totalActivities = activeStats.reduce((s: number, o: any) => s + (o.totalActivities ?? 0), 0);

  return (
    <div className="flex flex-col">
      <Topbar title="Performanca" subtitle="KPI-të e oficerëve dhe zyrave" />
      <div className="p-4 md:p-6 space-y-5">

        {/* Filters */}
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

        {/* Role pills + KPIs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["primary", "secondary"] as const).map((r) => (
              <button key={r} onClick={() => setRoleTab(r)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  roleTab === r
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                {r === "primary" ? "Primar" : "Sekondar"}
              </button>
            ))}
          </div>

          <div className="flex gap-3 flex-1 flex-wrap">
            {[
              { label: isOfficer ? "Klientë Aktive" : "Oficerë", value: isOfficer ? (officers[0]?.[roleTab]?.activeCases ?? 0) : officers.length },
              { label: "Aktivitete", value: totalActivities.toLocaleString() },
              { label: "I Mbledhur", value: formatCurrency(totalCollected) },
              { label: "Mesatare/Oficer", value: officers.length ? formatCurrency(totalCollected / officers.length) : "€0" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex-1 min-w-[120px]"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</div>
                <div className="text-[18px] font-bold text-gray-900 tabular leading-tight mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error?.message ?? String(error)}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : (
          <OfficerTable officers={officers} role={roleTab} />
        )}

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
