"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency } from "@/lib/utils";
import { institutions as instApi } from "@/lib/api";
import { Plus, RefreshCw, X, Pencil, Trash2, Building2 } from "lucide-react";
import { AccessGuard } from "@/components/AccessGuard";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/lib/auth";
import { DatePresetPicker, DatePreset, presetToRange, PERFORMANCE_PRESETS } from "@/components/ui/DatePresetPicker";
import { useRefreshing } from "@/lib/useRefreshing";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-modal-in modal-panel">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !shortName.trim()) { setError("Të dyja fushat janë të detyrueshme"); return; }
    setLoading(true); setError("");
    try { await instApi.create({ name, shortName: shortName.toUpperCase() }); onSaved(); onClose(); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <ModalShell title="Institucion i Ri" onClose={onClose}>
      <div className="p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}
        <div>
          <FieldLabel label="Emri i Plotë" required />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ProCredit Bank Kosovo" autoFocus
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
        </div>
        <div>
          <FieldLabel label="Kodi i Shkurtër" required />
          <input value={shortName} onChange={(e) => setShortName(e.target.value.toUpperCase())} placeholder="PCB" maxLength={10}
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 font-mono tracking-widest" />
        </div>
      </div>
      <div className="px-6 pb-5 flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
        <button onClick={submit} disabled={loading}
          className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {loading ? "Duke krijuar…" : "Krijo"}
        </button>
      </div>
    </ModalShell>
  );
}

function EditModal({ inst, onClose, onSaved }: { inst: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(inst.name ?? "");
  const [shortName, setShortName] = useState(inst.shortName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !shortName.trim()) { setError("Të dyja fushat janë të detyrueshme"); return; }
    setLoading(true); setError("");
    try { await instApi.update(inst.id, { name, shortName: shortName.toUpperCase() }); onSaved(); onClose(); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <ModalShell title="Ndrysho Institucionin" onClose={onClose}>
      <div className="p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}
        <div>
          <FieldLabel label="Emri i Plotë" required />
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
        </div>
        <div>
          <FieldLabel label="Kodi i Shkurtër" required />
          <input value={shortName} onChange={(e) => setShortName(e.target.value.toUpperCase())} maxLength={10}
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 font-mono tracking-widest" />
        </div>
      </div>
      <div className="px-6 pb-5 flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
        <button onClick={submit} disabled={loading}
          className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {loading ? "Duke ruajtur…" : "Ruaj"}
        </button>
      </div>
    </ModalShell>
  );
}

function Num({ v }: { v: number }) {
  return <span className={`tabular-nums text-[12px] ${v === 0 ? "text-gray-300" : "text-gray-700"}`}>{v === 0 ? "—" : v.toLocaleString()}</span>;
}
function Cur({ v, bold }: { v: number; bold?: boolean }) {
  return <span className={`tabular-nums text-[12px] ${v === 0 ? "text-gray-300" : bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>{v === 0 ? "—" : formatCurrency(v)}</span>;
}

function CollectionRate({ collected, original }: { collected: number; original: number }) {
  if (original === 0) return <span className="text-gray-300 text-[12px]">—</span>;
  const rate = Math.min((collected / original) * 100, 999);
  const pct  = Math.min(rate, 100);
  const color = rate >= 80 ? "#059669" : rate >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="tabular-nums text-[12px] font-medium" style={{ color }}>{rate.toFixed(1)}%</span>
    </div>
  );
}

const GRP = "border-l border-gray-100";

function InstitutionsPageInner() {
  const [showCreate, setShowCreate] = useState(false);
  const [editInst, setEditInst] = useState<any>(null);
  const { toast } = useToast();
  const { can } = useAuth();
  const [confirmModal, openConfirm] = useConfirm();

  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(() => presetToRange("month").from);
  const [dateTo,   setDateTo]   = useState(() => presetToRange("month").to);

  const swrKey = useMemo(() => ['institutions-stats', dateFrom, dateTo], [dateFrom, dateTo]);

  const { data = [], error, isLoading: loading, isValidating: refreshing, mutate } = useSWR(
    swrKey,
    () => instApi.stats({ from: dateFrom, to: dateTo }),
    { keepPreviousData: true },
  );
  const { triggerRefresh } = useRefreshing(refreshing);

  function deleteInst(inst: any) {
    openConfirm({
      title: `Fshi ${inst.name}`,
      message: inst.totalLoans > 0
        ? `Ky institucion ka ${inst.totalLoans} hua të lidhura dhe nuk mund të fshihet.`
        : "Institucioni do të fshihet përgjithmonë. Ky veprim nuk mund të zhbëhet.",
      confirmLabel: "Fshi",
      variant: inst.totalLoans > 0 ? "default" : "danger",
      onConfirm: async () => {
        if (inst.totalLoans > 0) return;
        await instApi.delete(inst.id);
        mutate();
        toast("Institucioni u fshi");
      },
    });
  }

  const list = data as any[];
  const totalOutstanding = list.reduce((s, i) => s + (i.totalOutstanding ?? 0), 0);

  const totals = useMemo(() => list.reduce(
    (acc, i) => ({
      totalCases:          acc.totalCases          + i.totalCases,
      activeCases:         acc.activeCases         + i.activeCases,
      totalOutstanding:    acc.totalOutstanding    + i.totalOutstanding,
      totalOriginal:       acc.totalOriginal       + i.totalOriginal,
      periodPaymentsValue: acc.periodPaymentsValue + i.periodPaymentsValue,
      periodPaymentsCount: acc.periodPaymentsCount + i.periodPaymentsCount,
      periodPromisesValue: acc.periodPromisesValue + i.periodPromisesValue,
      periodPromisesCount: acc.periodPromisesCount + i.periodPromisesCount,
      periodCalls:         acc.periodCalls         + i.periodCalls,
      periodVisits:        acc.periodVisits        + i.periodVisits,
      periodLegal:         acc.periodLegal         + i.periodLegal,
      periodOther:         acc.periodOther         + i.periodOther,
    }),
    { totalCases: 0, activeCases: 0, totalOutstanding: 0, totalOriginal: 0, periodPaymentsValue: 0, periodPaymentsCount: 0, periodPromisesValue: 0, periodPromisesCount: 0, periodCalls: 0, periodVisits: 0, periodLegal: 0, periodOther: 0 },
  ), [list]);

  // Period label for column headers
  const periodLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return "Ky Muaj";
    const fmt = (d: string) => new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" });
    if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
    return dateFrom ? `nga ${fmt(dateFrom)}` : `deri ${fmt(dateTo!)}`;
  }, [dateFrom, dateTo]);

  const TH  = "px-3 py-2 text-left   text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap";
  const THR = "px-3 py-2 text-right  text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap";
  const TD  = "px-3 py-2.5 text-right  align-middle";
  const TDL = "px-3 py-2.5 text-left   align-middle";

  return (
    <div className="flex flex-col">
      {confirmModal}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSaved={() => { mutate(); toast("Institucioni u krijua"); }} />}
      {editInst && <EditModal inst={editInst} onClose={() => setEditInst(null)} onSaved={() => { mutate(); toast("Institucioni u përditësua"); }} />}

      <Topbar title="Institucione Financiare" subtitle="Bankat dhe IFM-të partnere" />

      {/* Sticky toolbar */}
      <div className="sticky top-14 z-10 bg-[#F4F5F7] px-4 md:px-6 pt-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <DatePresetPicker
            label="Periudha"
            value={datePreset}
            presets={PERFORMANCE_PRESETS}
            onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); }}
          />
          <button onClick={() => triggerRefresh(() => mutate())} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          {can("institution:create") && (
            <button onClick={() => setShowCreate(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors shrink-0">
              <Plus size={14} /> Shto Institucion
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 space-y-4">

        {/* Summary KPI cards */}
        {!loading && list.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Borxh Total Aktual",    value: formatCurrency(totals.totalOutstanding) },
              { label: "Borxh Origjinal Total", value: formatCurrency(totals.totalOriginal) },
              { label: "Arkëtuar · Periudha",   value: formatCurrency(totals.periodPaymentsValue) },
              { label: "Shkalla e Arkëtimit",   value: totals.totalOriginal > 0 ? `${((totals.periodPaymentsValue / totals.totalOriginal) * 100).toFixed(2)}%` : "—" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</div>
                <div className="text-[18px] md:text-[20px] font-bold text-gray-900 tabular leading-tight mt-1.5">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{String(error)}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Building2 size={28} className="text-gray-300" />
            <p className="text-[13px] text-gray-400">Nuk ka institucione aktive</p>
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className={`${TH} sticky left-0 bg-gray-50/80 z-10`} rowSpan={2}>Institucioni</th>
                      <th colSpan={5} className="px-3 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-widest text-center bg-gray-50/80 border-b border-gray-100">
                        Portofoli
                      </th>
                      <th colSpan={3} className={`px-3 py-1.5 text-[9px] font-semibold text-indigo-500 uppercase tracking-widest text-center bg-indigo-50/60 border-b border-gray-100 ${GRP}`}>
                        Pagesat · {periodLabel}
                      </th>
                      <th colSpan={2} className={`px-3 py-1.5 text-[9px] font-semibold text-amber-600 uppercase tracking-widest text-center bg-amber-50/60 border-b border-gray-100 ${GRP}`}>
                        Premtimet · {periodLabel}
                      </th>
                      <th colSpan={4} className={`px-3 py-1.5 text-[9px] font-semibold text-teal-600 uppercase tracking-widest text-center bg-teal-50/60 border-b border-gray-100 ${GRP}`}>
                        Aktivitetet · {periodLabel}
                      </th>
                      {can("institution:edit") && <th className="bg-gray-50/80 border-b border-gray-100 w-12" rowSpan={2} />}
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className={`${THR} bg-gray-50/80`}>Borxh Aktual</th>
                      <th className={`${THR} bg-gray-50/80`}>Origjinal</th>
                      <th className={`${THR} bg-gray-50/80`}>%</th>
                      <th className={`${THR} bg-gray-50/80`}>Klientë</th>
                      <th className={`${THR} bg-gray-50/80`}>Aktive</th>
                      <th className={`${THR} bg-indigo-50/60 ${GRP}`}>Vlerë (€)</th>
                      <th className={`${THR} bg-indigo-50/60`}>Nr.</th>
                      <th className={`${THR} bg-indigo-50/60`}>Shkalla</th>
                      <th className={`${THR} bg-amber-50/60 ${GRP}`}>Vlerë (€)</th>
                      <th className={`${THR} bg-amber-50/60`}>Nr.</th>
                      <th className={`${THR} bg-teal-50/60 ${GRP}`}>Telefonata</th>
                      <th className={`${THR} bg-teal-50/60`}>Vizita</th>
                      <th className={`${THR} bg-teal-50/60`}>Juridike</th>
                      <th className={`${THR} bg-teal-50/60`}>Tjera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {list.map((inst) => {
                      const share = totalOutstanding > 0 ? (inst.totalOutstanding / totalOutstanding) * 100 : 0;
                      return (
                        <tr key={inst.id} className="hover:bg-brand-50/30 transition-colors group">
                          <td className={`${TDL} sticky left-0 bg-white group-hover:bg-brand-50/30 transition-colors z-10`}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <span className="text-gray-600 text-[9px] font-bold leading-none">{inst.shortName}</span>
                              </div>
                              <span className="text-[13px] font-medium text-gray-900 whitespace-nowrap">{inst.name}</span>
                            </div>
                          </td>
                          {/* Portfolio */}
                          <td className={TD}>
                            <span className="tabular-nums text-[12px] font-semibold text-gray-900">{formatCurrency(inst.totalOutstanding)}</span>
                            <div className="mt-1 h-0.5 bg-gray-100 rounded-full overflow-hidden w-14 ml-auto">
                              <div className="h-full bg-brand-300 rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                            </div>
                          </td>
                          <td className={TD}><Cur v={inst.totalOriginal} /></td>
                          <td className={TD}><span className="tabular-nums text-[12px] text-gray-400">{share.toFixed(1)}%</span></td>
                          <td className={TD}><Num v={inst.totalCases} /></td>
                          <td className={TD}><Num v={inst.activeCases} /></td>
                          {/* Payments */}
                          <td className={`${TD} ${GRP}`}><Cur v={inst.periodPaymentsValue} bold /></td>
                          <td className={TD}><Num v={inst.periodPaymentsCount} /></td>
                          <td className={TD}>
                            <CollectionRate collected={inst.periodPaymentsValue} original={inst.totalOriginal} />
                          </td>
                          {/* Promises */}
                          <td className={`${TD} ${GRP}`}><Cur v={inst.periodPromisesValue} /></td>
                          <td className={TD}><Num v={inst.periodPromisesCount} /></td>
                          {/* Activities */}
                          <td className={`${TD} ${GRP}`}><Num v={inst.periodCalls} /></td>
                          <td className={TD}><Num v={inst.periodVisits} /></td>
                          <td className={TD}><Num v={inst.periodLegal} /></td>
                          <td className={TD}><Num v={inst.periodOther} /></td>
                          {can("institution:edit") && (
                            <td className="px-2 py-2.5 align-middle">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                <button onClick={() => setEditInst(inst)}
                                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                  <Pencil size={13} />
                                </button>
                                {can("institution:delete") && (
                                  <button onClick={() => deleteInst(inst)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {list.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                        <td className={`${TDL} sticky left-0 bg-gray-50/80 z-10`}>
                          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Totali</span>
                        </td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-bold text-gray-900">{formatCurrency(totals.totalOutstanding)}</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-bold text-gray-900">{formatCurrency(totals.totalOriginal)}</span></td>
                        <td className={TD}><span className="text-[12px] text-gray-400">100%</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.totalCases.toLocaleString()}</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.activeCases.toLocaleString()}</span></td>
                        <td className={`${TD} ${GRP}`}><span className="tabular-nums text-[12px] font-bold text-gray-900">{formatCurrency(totals.periodPaymentsValue)}</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.periodPaymentsCount.toLocaleString()}</span></td>
                        <td className={TD}>
                          <CollectionRate collected={totals.periodPaymentsValue} original={totals.totalOriginal} />
                        </td>
                        <td className={`${TD} ${GRP}`}><span className="tabular-nums text-[12px] font-bold text-gray-900">{formatCurrency(totals.periodPromisesValue)}</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.periodPromisesCount.toLocaleString()}</span></td>
                        <td className={`${TD} ${GRP}`}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.periodCalls.toLocaleString()}</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.periodVisits.toLocaleString()}</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.periodLegal.toLocaleString()}</span></td>
                        <td className={TD}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.periodOther.toLocaleString()}</span></td>
                        {can("institution:edit") && <td />}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ── Mobile cards ── */}
            <div className="md:hidden space-y-3">
              {list.map((inst) => {
                const share = totalOutstanding > 0 ? (inst.totalOutstanding / totalOutstanding) * 100 : 0;
                const rate  = inst.totalOriginal > 0 ? (inst.periodPaymentsValue / inst.totalOriginal) * 100 : null;
                const rateColor = rate === null ? "#9ca3af" : rate >= 80 ? "#059669" : rate >= 40 ? "#d97706" : "#dc2626";
                return (
                  <div key={inst.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-gray-600 text-[10px] font-bold leading-none">{inst.shortName}</span>
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-gray-900">{inst.name}</div>
                          <div className="text-[11px] text-gray-400">{share.toFixed(1)}% e portofolit total</div>
                        </div>
                      </div>
                      {can("institution:edit") && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditInst(inst)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          {can("institution:delete") && (
                            <button onClick={() => deleteInst(inst)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Portfolio strip */}
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Borxh Aktual",  value: formatCurrency(inst.totalOutstanding) },
                        { label: "Borxh Origjinal", value: formatCurrency(inst.totalOriginal) },
                        { label: "Klientë Aktive", value: `${inst.activeCases} / ${inst.totalCases}` },
                        { label: "Shkalla",        value: rate !== null ? `${rate.toFixed(1)}%` : "—", color: rateColor },
                      ].map((s) => (
                        <div key={s.label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{s.label}</div>
                          <div className="text-[13px] font-semibold mt-0.5" style={{ color: s.color ?? "#111827" }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Period activity */}
                    <div className="border-t border-gray-100 pt-2.5">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-2">{periodLabel}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Arkëtuar",   value: inst.periodPaymentsValue > 0 ? formatCurrency(inst.periodPaymentsValue) : "—" },
                          { label: "Premtime",   value: inst.periodPromisesCount > 0 ? `${inst.periodPromisesCount}` : "—" },
                          { label: "Aktivitete", value: (inst.periodCalls + inst.periodVisits + inst.periodLegal + inst.periodOther) > 0
                            ? (inst.periodCalls + inst.periodVisits + inst.periodLegal + inst.periodOther).toString() : "—" },
                        ].map((s) => (
                          <div key={s.label} className="text-center">
                            <div className="text-[10px] text-gray-400">{s.label}</div>
                            <div className="text-[13px] font-semibold text-gray-800 mt-0.5">{s.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function InstitutionsPage() {
  return (
    <AccessGuard permission="page:institutions">
      <InstitutionsPageInner />
    </AccessGuard>
  );
}
