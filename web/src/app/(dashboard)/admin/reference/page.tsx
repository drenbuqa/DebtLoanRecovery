"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useFormErrors } from "@/lib/form";
import Topbar from "@/components/layout/Topbar";
import { offices as officesApi, performance as perfApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { RefreshCw, Plus, X, MapPin, Users, FolderOpen, TrendingUp, Activity, CreditCard } from "lucide-react";
import { AccessGuard } from "@/components/AccessGuard";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";
import { DatePresetPicker, DatePreset, presetToRange, PERFORMANCE_PRESETS } from "@/components/ui/DatePresetPicker";

function OF({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500 font-bold">*</span> : <span className="text-gray-300 font-normal normal-case tracking-normal text-[10px]">(opsionale)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">↑ {error}</p>}
    </div>
  );
}

function AddOfficeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { touch, touchAll, fieldError } = useFormErrors();

  const nameError = fieldError("name", name, { required: true });
  const codeError = fieldError("code", code, {
    required: true,
    pattern: /^[A-Z]{2,10}$/,
    custom: (v) => !/^[A-Z]{2,10}$/.test(v) ? "2–10 shkronja të mëdha" : null,
  });

  async function create() {
    touchAll(["name", "code"]);
    if (nameError || codeError) return;
    setSaving(true); setSubmitError("");
    try {
      await officesApi.create({ name: name.trim(), code: code.trim().toUpperCase() });
      onCreated(); onClose();
    } catch (e: any) { setSubmitError(e.message); }
    finally { setSaving(false); }
  }

  const inp = (hasErr: boolean) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${hasErr ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-modal-in modal-panel">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Zyrë e Re</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{submitError}</div>}
          <OF label="Emri i Zyrës" required error={nameError}>
            <input value={name} onChange={(e) => setName(e.target.value)}
              onBlur={() => touch("name")}
              placeholder="p.sh. Zyra Prishtinë" autoFocus
              className={inp(!!nameError)} />
          </OF>
          <OF label="Kodi i Shkurtër" required error={codeError}>
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); touch("code"); }}
              onBlur={() => touch("code")}
              placeholder="PRI" maxLength={10}
              className={`${inp(!!codeError)} font-mono`} />
            <p className="text-[11px] text-gray-400 mt-1">2–10 shkronja të mëdha, përdoret si identifikues i shkurtër.</p>
          </OF>
        </div>
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
          <button onClick={create} disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {saving ? "Duke ruajtur…" : "Krijo Zyrën"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCell({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-gray-500" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-gray-400 leading-none mb-0.5">{label}</div>
        <div className="text-[14px] font-semibold text-gray-900 tabular">{value}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function OfficesPageInner() {
  const { can } = useAuth();
  const [refreshing, triggerRefresh] = useRefreshing();
  const [offices, setOffices] = useState<any[]>([]);
  const [perf, setPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(() => presetToRange("month").from);
  const [dateTo,   setDateTo]   = useState(() => presetToRange("month").to);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ol, ps] = await Promise.all([
        officesApi.list(),
        perfApi.offices({ from: dateFrom, to: dateTo }),
      ]);
      setOffices(ol);
      setPerf(ps);
    } catch (e: any) {
      setLoadError(e.message ?? "Gabim gjatë ngarkimit");
    } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Merge offices list with perf data
  const merged = offices.map((o) => {
    const p = perf.find((x) => x.id === o.id) ?? {};
    return { ...o, ...p };
  });

  // Totals
  const totalActive    = merged.reduce((s, o) => s + (o.activeCases ?? 0), 0);
  const totalCases     = merged.reduce((s, o) => s + (o.totalCases ?? o.caseCount ?? 0), 0);
  const totalCollected = merged.reduce((s, o) => s + (o.collected ?? 0), 0);
  const totalActivities = merged.reduce((s, o) => s + (o.activities ?? 0), 0);
  const totalOfficers  = merged.reduce((s, o) => s + (o.officerCount ?? o.userCount ?? 0), 0);

  const periodLabel = PERFORMANCE_PRESETS.find((p) => p.key === datePreset)?.label ?? "";

  return (
    <div className="flex flex-col">
      {showAdd && <AddOfficeModal onClose={() => setShowAdd(false)} onCreated={load} />}

      <Topbar title="Zyret" subtitle="Pasqyrë e performancës në të gjitha zyret e arkëtimit" />

      <div className="p-4 md:p-6 space-y-5">

        {/* Period selector + refresh */}
        <div className="flex items-center gap-2">
          <DatePresetPicker
            label="Periudha"
            value={datePreset}
            presets={PERFORMANCE_PRESETS}
            onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); }}
          />
          <div className="ml-auto flex items-center gap-2">
            {can("office:create") && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors ml-auto">
                <Plus size={13} /> Shto Zyrë
              </button>
            )}
            <button onClick={() => triggerRefresh(load)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Zyra",          value: merged.length },
            { label: "Oficerë",       value: totalOfficers },
            { label: "Dosje Aktive",  value: totalActive },
            { label: "I Mbledhur",    value: formatCurrency(totalCollected), emerald: true },
            { label: "Aktivitete",    value: totalActivities },
          ].map((s: any) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</div>
              <div className="text-[22px] font-bold tabular leading-tight mt-1.5 text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Office cards */}
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : merged.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MapPin size={22} className="text-gray-400" />
            </div>
            <div className="text-center">
              <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk ka zyra ende</div>
              <div className="text-[12px] text-gray-400">Shtoni zyrën tuaj të parë për të filluar gjurmimin e performancës.</div>
            </div>
            {can("office:create") && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 transition-colors">
                <Plus size={13} /> Shto Zyrë
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {merged.map((o) => {
              const activeCases  = o.activeCases ?? 0;
              const totalC       = o.totalCases ?? o.caseCount ?? 0;
              const collected    = o.collected ?? 0;
              const activities   = o.activities ?? 0;
              const officerCount = o.officerCount ?? o.userCount ?? 0;
              const shareOfTotal = totalCollected > 0 ? (collected / totalCollected) * 100 : 0;

              return (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-brand-300 hover:shadow-sm transition-all">
                  {/* Card header */}
                  <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                        <MapPin size={15} className="text-brand-600" />
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-gray-900">{o.name}</div>
                        <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{o.code}</span>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${o.isActive !== false ? "bg-emerald-400" : "bg-gray-300"}`} title={o.isActive !== false ? "Aktiv" : "Joaktiv"} />
                  </div>

                  {/* Stats grid */}
                  <div className="p-4 grid grid-cols-2 gap-2">
                    <StatCell icon={FolderOpen}  label="Dosje Aktive"  value={String(activeCases)} sub={`${totalC} gjithsej`} />
                    <StatCell icon={Users}        label="Oficerë"       value={String(officerCount)} />
                    <StatCell icon={CreditCard}   label={`I Mbledhur (${periodLabel})`} value={formatCurrency(collected)} />
                    <StatCell icon={Activity}     label={`Aktivitete (${periodLabel})`} value={String(activities)} />
                  </div>

                  {/* Share of total collections bar */}
                  {totalCollected > 0 && (
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                        <span>Pjesa e arkëtimeve totale</span>
                        <span className="font-semibold text-gray-600">{shareOfTotal.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(shareOfTotal, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OfficesPage() {
  return (
    <AccessGuard permission="page:admin:offices">
      <OfficesPageInner />
    </AccessGuard>
  );
}
