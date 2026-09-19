"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";
import { performance as perfApi, offices as officesApi } from "@/lib/api";
import { RefreshCw, TrendingUp } from "lucide-react";
import { useRefreshing } from "@/lib/useRefreshing";
import { useAuth } from "@/lib/auth";
import { AccessGuard } from "@/components/AccessGuard";
import { Select } from "@/components/ui/Select";
import { DatePresetPicker, DatePreset, presetToRange, PERFORMANCE_PRESETS } from "@/components/ui/DatePresetPicker";

function OfficerBarChart({ officers }: { officers: any[] }) {
  const sorted = [...officers].sort((a, b) => b.collectedAmount - a.collectedAmount).slice(0, 8);
  const maxAmt = Math.max(...sorted.map((o) => o.collectedAmount), 1);
  if (sorted.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-brand-600" />
        <h3 className="text-[13px] font-semibold text-gray-900">Arkëtime sipas Oficerit</h3>
        <span className="text-[11px] text-gray-400 ml-auto">Top {sorted.length} · renditur sipas të mbledhurës</span>
      </div>
      <div className="space-y-3">
        {sorted.map((o, i) => {
          const pct = maxAmt > 0 ? (o.collectedAmount / maxAmt) * 100 : 0;
          const initials = o.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div key={o.id} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <span className="text-brand-700 text-[9px] font-bold">{initials}</span>
              </div>
              <div className="w-28 shrink-0 text-[12px] text-gray-700 truncate">{o.fullName.split(" ")[0]}</div>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: i === 0 ? "#7c3aed" : i <= 2 ? "#a78bfa" : "#c4b5fd",
                  }}
                />
              </div>
              <div className="w-20 text-right text-[12px] font-semibold tabular shrink-0"
                style={{ color: o.collectedAmount > 0 ? "#059669" : "#9ca3af" }}>
                {formatCurrency(o.collectedAmount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PerformancePageInner() {
  const { user } = useAuth();
  const isOfficer = user?.role === "OFFICER";
  const isAdmin = user?.role === "ADMIN";

  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(() => presetToRange("month").from);
  const [dateTo,   setDateTo]   = useState(() => presetToRange("month").to);
  const [officeFilter, setOfficeFilter] = useState("");
  const [officers, setOfficers] = useState<any[]>([]);
  const [institutionStats, setInstitutionStats] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, triggerRefresh] = useRefreshing();
  const [activeTab, setActiveTab] = useState<"officers" | "institutions">("officers");

  async function load() {
    setLoading(true); setError("");
    try {
      const officerParams: any = { from: dateFrom, to: dateTo };
      if (!isOfficer && officeFilter) officerParams.officeId = officeFilter;
      const [o, off, instS] = await Promise.all([
        perfApi.officers(officerParams),
        isAdmin ? officesApi.list() : Promise.resolve([]),
        perfApi.institutions({ from: dateFrom, to: dateTo }),
      ]);
      setOfficers(o);
      setOffices(off);
      setInstitutionStats(instS);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [dateFrom, dateTo, officeFilter]);

  const totalCollected = officers.reduce((s, o) => s + o.collectedAmount, 0);
  const totalActivities = officers.reduce((s, o) => s + o.totalActivities, 0);
  const totalInstCollected = institutionStats.reduce((s, i) => s + i.collected, 0);
  const totalInstOutstanding = institutionStats.reduce((s, i) => s + i.totalOutstanding, 0);

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
          {isAdmin && activeTab === "officers" && (
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
          <button onClick={() => triggerRefresh(load)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-auto">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(activeTab === "officers" ? [
            { label: isOfficer ? "Rastet Aktive Tuaja" : "Oficerë të Gjurmuar", value: isOfficer ? (officers[0]?.activeCases ?? 0) : officers.length },
            { label: "Aktivitete Totale", value: totalActivities.toLocaleString() },
            { label: "Totali i Mbledhur", value: formatCurrency(totalCollected) },
            { label: isOfficer ? "Premtime të Hapura" : "Mesatare për Oficer", value: isOfficer ? (officers[0]?.promises ?? 0) : (officers.length ? formatCurrency(totalCollected / officers.length) : "€0") },
          ] : [
            { label: "Institucione", value: institutionStats.length },
            { label: "Totali i Mbledhur", value: formatCurrency(totalInstCollected) },
            { label: "Borxhi Total Aktual", value: formatCurrency(totalInstOutstanding) },
            { label: "Rast Aktive", value: institutionStats.reduce((s, i) => s + i.activeCases, 0).toLocaleString() },
          ]).map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</div>
              <div className="text-[22px] font-bold text-gray-900 tabular leading-tight mt-1.5">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Officers bar chart */}
        {!loading && officers.length > 0 && (
          <OfficerBarChart officers={officers} />
        )}

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200">
          {(["officers", "institutions"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === t
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}>
              {t === "officers" ? "Zyrtarët" : "Institucionet"}
            </button>
          ))}
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : activeTab === "officers" ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Table>
              <Thead>
                <tr>
                  <Th>Oficer</Th>
                  <Th>Zyrë</Th>
                  <Th>Rast Aktive</Th>
                  <Th>Telefonata</Th>
                  <Th>Vizita</Th>
                  <Th>Premtime</Th>
                  <Th>Shuma e Premtimit</Th>
                  <Th>I Mbledhur</Th>
                  <Th>Shkalla e Arkëtimit</Th>
                </tr>
              </Thead>
              <Tbody>
                {officers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-[13px]">Nuk ka të dhëna për periudhën e zgjedhur</td></tr>
                ) : officers.sort((a, b) => b.collectedAmount - a.collectedAmount).map((o) => (
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
                    <Td><span className="tabular text-gray-700 font-medium">{o.activeCases}</span></Td>
                    <Td><span className="tabular text-gray-700">{o.calls}</span></Td>
                    <Td><span className="tabular text-gray-700">{o.visits}</span></Td>
                    <Td><span className="tabular text-gray-700">{o.promises}</span></Td>
                    <Td><span className="tabular text-gray-600">{formatCurrency(o.promiseAmount)}</span></Td>
                    <Td>
                      <span className={`tabular font-semibold ${o.collectedAmount > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                        {formatCurrency(o.collectedAmount)}
                      </span>
                    </Td>
                    <Td>
                      {o.collectionRate !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(o.collectionRate, 100)}%` }} />
                          </div>
                          <span className="text-[12px] text-gray-600 tabular">{o.collectionRate}%</span>
                        </div>
                      ) : o.activeCases > 0 && o.collectedAmount === 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: "0%" }} />
                          </div>
                          <span className="text-[12px] text-gray-400 tabular">0%</span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Table>
              <Thead>
                <tr>
                  <Th>Institucioni</Th>
                  <Th>Rast Totale</Th>
                  <Th>Rast Aktive</Th>
                  <Th>Borxhi Aktual</Th>
                  <Th>Borxhi Origjinal</Th>
                  <Th>Aktivitete</Th>
                  <Th>I Mbledhur</Th>
                  <Th>Shkalla Arkëtimit</Th>
                </tr>
              </Thead>
              <Tbody>
                {institutionStats.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-[13px]">Nuk ka të dhëna</td></tr>
                ) : institutionStats.sort((a, b) => b.collected - a.collected).map((inst) => {
                  const rate = inst.totalOriginal > 0 ? ((inst.collected / inst.totalOriginal) * 100).toFixed(1) : null;
                  return (
                    <Tr key={inst.id}>
                      <Td>
                        <div>
                          <div className="font-medium text-gray-900">{inst.name}</div>
                          <div className="text-[11px] text-gray-400">{inst.shortName}</div>
                        </div>
                      </Td>
                      <Td><span className="tabular text-gray-600">{inst.totalCases}</span></Td>
                      <Td><span className="tabular font-medium text-gray-700">{inst.activeCases}</span></Td>
                      <Td><span className="tabular text-gray-700">{formatCurrency(inst.totalOutstanding)}</span></Td>
                      <Td><span className="tabular text-gray-500">{formatCurrency(inst.totalOriginal)}</span></Td>
                      <Td><span className="tabular text-gray-600">{inst.activities}</span></Td>
                      <Td><span className={`tabular font-semibold ${inst.collected > 0 ? "text-emerald-700" : "text-gray-400"}`}>{formatCurrency(inst.collected)}</span></Td>
                      <Td>
                        {rate !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(Number(rate), 100)}%` }} />
                            </div>
                            <span className="text-[12px] text-gray-600 tabular">{rate}%</span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>
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
