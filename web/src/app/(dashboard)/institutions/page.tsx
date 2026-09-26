"use client";

import { useState } from "react";
import useSWR from "swr";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency } from "@/lib/utils";
import { institutions as instApi } from "@/lib/api";
import { Plus, RefreshCw, X, Pencil, Trash2, Building2 } from "lucide-react";
import { AccessGuard } from "@/components/AccessGuard";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/lib/auth";

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

// Compact number cell
function N({ v, color }: { v: number; color?: string }) {
  return (
    <span className={`tabular-nums text-[12px] font-medium ${v === 0 ? "text-gray-300" : color ?? "text-gray-700"}`}>
      {v === 0 ? "—" : v.toLocaleString()}
    </span>
  );
}

function C({ v }: { v: number }) {
  return (
    <span className={`tabular-nums text-[12px] font-medium ${v === 0 ? "text-gray-300" : "text-gray-700"}`}>
      {v === 0 ? "—" : formatCurrency(v)}
    </span>
  );
}

function InstitutionsPageInner() {
  const [showCreate, setShowCreate] = useState(false);
  const [editInst, setEditInst] = useState<any>(null);
  const { toast } = useToast();
  const { can } = useAuth();
  const [confirmModal, openConfirm] = useConfirm();

  const { data = [], error, isLoading: loading, mutate } = useSWR(
    'institutions-stats',
    () => instApi.stats(),
    { keepPreviousData: true },
  );

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

  // Month label e.g. "01–27 Shtator"
  const now = new Date();
  const day = now.getDate();
  const monthName = now.toLocaleDateString("sq-AL", { month: "long" });
  const monthLabel = `01–${String(day).padStart(2, "0")} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

  const totalOutstanding = (data as any[]).reduce((s: number, i: any) => s + (i.totalOutstanding ?? 0), 0);

  // Totals row
  const totals = (data as any[]).reduce(
    (acc: any, i: any) => ({
      totalLoans:          acc.totalLoans          + i.totalLoans,
      totalCases:          acc.totalCases          + i.totalCases,
      activeCases:         acc.activeCases         + i.activeCases,
      totalOutstanding:    acc.totalOutstanding    + i.totalOutstanding,
      monthPaymentsValue:  acc.monthPaymentsValue  + i.monthPaymentsValue,
      monthPaymentsCount:  acc.monthPaymentsCount  + i.monthPaymentsCount,
      monthPromisesValue:  acc.monthPromisesValue  + i.monthPromisesValue,
      monthPromisesCount:  acc.monthPromisesCount  + i.monthPromisesCount,
      monthCalls:          acc.monthCalls          + i.monthCalls,
      monthVisits:         acc.monthVisits         + i.monthVisits,
      monthLegal:          acc.monthLegal          + i.monthLegal,
      monthOther:          acc.monthOther          + i.monthOther,
    }),
    { totalLoans: 0, totalCases: 0, activeCases: 0, totalOutstanding: 0, monthPaymentsValue: 0, monthPaymentsCount: 0, monthPromisesValue: 0, monthPromisesCount: 0, monthCalls: 0, monthVisits: 0, monthLegal: 0, monthOther: 0 },
  );

  const thBase = "px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-right";
  const thLeft = "px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-left";
  const tdBase = "px-3 py-2.5 text-right align-middle";
  const tdLeft = "px-3 py-2.5 text-left align-middle";

  return (
    <div className="flex flex-col">
      {confirmModal}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSaved={() => { mutate(); toast("Institucioni u krijua"); }} />}
      {editInst && <EditModal inst={editInst} onClose={() => setEditInst(null)} onSaved={() => { mutate(); toast("Institucioni u përditësua"); }} />}

      <Topbar title="Institucione Financiare" subtitle="Bankat dhe IFM-të partnere" />

      <div className="p-4 md:p-6 space-y-4">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              Muaji aktual: {monthLabel}
            </span>
          </div>
          {can("institution:create") && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors">
              <Plus size={14} /> Shto Institucion
            </button>
          )}
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{String(error)}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Building2 size={28} className="text-gray-300" />
            <p className="text-[13px] text-gray-400">Nuk ka institucione aktive</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  {/* Group headers */}
                  <tr className="border-b border-gray-100">
                    <th className={`${thLeft} border-r border-gray-100`} rowSpan={2}>Institucioni</th>
                    {/* Portfolio */}
                    <th colSpan={4} className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center border-r border-gray-100 bg-gray-50/60">
                      Portofoli
                    </th>
                    {/* This month - Payments */}
                    <th colSpan={2} className="px-3 py-2 text-[10px] font-semibold text-emerald-600 uppercase tracking-wide text-center border-r border-gray-100 bg-emerald-50/40">
                      Pagesat · {monthLabel}
                    </th>
                    {/* This month - Promises */}
                    <th colSpan={2} className="px-3 py-2 text-[10px] font-semibold text-amber-600 uppercase tracking-wide text-center border-r border-gray-100 bg-amber-50/40">
                      Premtimet · {monthLabel}
                    </th>
                    {/* This month - Activities */}
                    <th colSpan={4} className="px-3 py-2 text-[10px] font-semibold text-blue-600 uppercase tracking-wide text-center bg-blue-50/40">
                      Aktivitetet · {monthLabel}
                    </th>
                    {can("institution:edit") && <th className="w-8" />}
                  </tr>
                  {/* Column headers */}
                  <tr className="border-b border-gray-200 bg-gray-50/40">
                    {/* Portfolio cols */}
                    <th className={`${thBase} border-r border-gray-100`}>Borxh (€)</th>
                    <th className={`${thBase} border-r border-gray-100`}>Portofoli %</th>
                    <th className={`${thBase} border-r border-gray-100`}>Klientë</th>
                    <th className={`${thBase} border-r border-gray-100`}>Aktive</th>
                    {/* Payment cols */}
                    <th className={`${thBase} border-r border-gray-100 text-emerald-700`}>Vlerë (€)</th>
                    <th className={`${thBase} border-r border-gray-100 text-emerald-700`}>Nr.</th>
                    {/* Promise cols */}
                    <th className={`${thBase} border-r border-gray-100 text-amber-700`}>Vlerë (€)</th>
                    <th className={`${thBase} border-r border-gray-100 text-amber-700`}>Nr.</th>
                    {/* Activity cols */}
                    <th className={`${thBase} text-blue-700`}>Telefonata</th>
                    <th className={`${thBase} text-blue-700`}>Vizita</th>
                    <th className={`${thBase} text-blue-700`}>Juridike</th>
                    <th className={`${thBase} text-blue-700`}>Tjera</th>
                    {can("institution:edit") && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data as any[]).map((inst) => {
                    const share = totalOutstanding > 0 ? (inst.totalOutstanding / totalOutstanding) * 100 : 0;
                    return (
                      <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors group">
                        {/* Institution */}
                        <td className={`${tdLeft} border-r border-gray-100`}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                              <span className="text-brand-700 text-[9px] font-bold leading-none">{inst.shortName}</span>
                            </div>
                            <span className="text-[12px] font-semibold text-gray-800 whitespace-nowrap">{inst.name}</span>
                          </div>
                        </td>
                        {/* Portfolio */}
                        <td className={`${tdBase} border-r border-gray-100`}>
                          <span className="tabular-nums text-[12px] font-semibold text-gray-800">{formatCurrency(inst.totalOutstanding)}</span>
                          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden w-20 ml-auto">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                          </div>
                        </td>
                        <td className={`${tdBase} border-r border-gray-100`}>
                          <span className="tabular-nums text-[12px] text-gray-500">{share.toFixed(1)}%</span>
                        </td>
                        <td className={`${tdBase} border-r border-gray-100`}><N v={inst.totalCases} /></td>
                        <td className={`${tdBase} border-r border-gray-100`}><N v={inst.activeCases} color="text-emerald-600" /></td>
                        {/* Payments */}
                        <td className={`${tdBase} border-r border-gray-100 bg-emerald-50/20`}><C v={inst.monthPaymentsValue} /></td>
                        <td className={`${tdBase} border-r border-gray-100 bg-emerald-50/20`}><N v={inst.monthPaymentsCount} color="text-emerald-700" /></td>
                        {/* Promises */}
                        <td className={`${tdBase} border-r border-gray-100 bg-amber-50/20`}><C v={inst.monthPromisesValue} /></td>
                        <td className={`${tdBase} border-r border-gray-100 bg-amber-50/20`}><N v={inst.monthPromisesCount} color="text-amber-700" /></td>
                        {/* Activities */}
                        <td className={`${tdBase} bg-blue-50/10`}><N v={inst.monthCalls} color="text-blue-700" /></td>
                        <td className={`${tdBase} bg-blue-50/10`}><N v={inst.monthVisits} color="text-blue-700" /></td>
                        <td className={`${tdBase} bg-blue-50/10`}><N v={inst.monthLegal} color="text-blue-700" /></td>
                        <td className={`${tdBase} bg-blue-50/10`}><N v={inst.monthOther} color="text-blue-700" /></td>
                        {/* Actions */}
                        {can("institution:edit") && (
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditInst(inst)}
                                className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Ndrysho">
                                <Pencil size={12} />
                              </button>
                              {can("institution:delete") && (
                                <button onClick={() => deleteInst(inst)}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Fshi">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                {(data as any[]).length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/60">
                      <td className={`${tdLeft} border-r border-gray-100`}>
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Totali</span>
                      </td>
                      <td className={`${tdBase} border-r border-gray-100`}>
                        <span className="tabular-nums text-[12px] font-bold text-gray-900">{formatCurrency(totals.totalOutstanding)}</span>
                      </td>
                      <td className={`${tdBase} border-r border-gray-100`}><span className="text-[12px] text-gray-400">100%</span></td>
                      <td className={`${tdBase} border-r border-gray-100`}><span className="tabular-nums text-[12px] font-semibold text-gray-700">{totals.totalCases.toLocaleString()}</span></td>
                      <td className={`${tdBase} border-r border-gray-100`}><span className="tabular-nums text-[12px] font-semibold text-emerald-700">{totals.activeCases.toLocaleString()}</span></td>
                      <td className={`${tdBase} border-r border-gray-100 bg-emerald-50/30`}><span className="tabular-nums text-[12px] font-bold text-emerald-700">{formatCurrency(totals.monthPaymentsValue)}</span></td>
                      <td className={`${tdBase} border-r border-gray-100 bg-emerald-50/30`}><span className="tabular-nums text-[12px] font-semibold text-emerald-700">{totals.monthPaymentsCount.toLocaleString()}</span></td>
                      <td className={`${tdBase} border-r border-gray-100 bg-amber-50/30`}><span className="tabular-nums text-[12px] font-bold text-amber-700">{formatCurrency(totals.monthPromisesValue)}</span></td>
                      <td className={`${tdBase} border-r border-gray-100 bg-amber-50/30`}><span className="tabular-nums text-[12px] font-semibold text-amber-700">{totals.monthPromisesCount.toLocaleString()}</span></td>
                      <td className={`${tdBase} bg-blue-50/20`}><span className="tabular-nums text-[12px] font-semibold text-blue-700">{totals.monthCalls.toLocaleString()}</span></td>
                      <td className={`${tdBase} bg-blue-50/20`}><span className="tabular-nums text-[12px] font-semibold text-blue-700">{totals.monthVisits.toLocaleString()}</span></td>
                      <td className={`${tdBase} bg-blue-50/20`}><span className="tabular-nums text-[12px] font-semibold text-blue-700">{totals.monthLegal.toLocaleString()}</span></td>
                      <td className={`${tdBase} bg-blue-50/20`}><span className="tabular-nums text-[12px] font-semibold text-blue-700">{totals.monthOther.toLocaleString()}</span></td>
                      {can("institution:edit") && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
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
