"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency } from "@/lib/utils";
import { institutions as instApi } from "@/lib/api";
import { Plus, RefreshCw, X, Pencil, Trash2 } from "lucide-react";
import { AccessGuard } from "@/components/AccessGuard";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/lib/auth";

// ── Shared modal shell (same pattern as UserModal, ResetPasswordModal) ──────
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

// ── Create modal ─────────────────────────────────────────────
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

// ── Edit modal ───────────────────────────────────────────────
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

// ── Page ─────────────────────────────────────────────────────
function InstitutionsPageInner() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editInst, setEditInst] = useState<any>(null);
  const { toast } = useToast();
  const { can } = useAuth();
  const [confirmModal, openConfirm] = useConfirm();

  async function load() {
    setLoading(true); setError("");
    try { setData(await instApi.stats()); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

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
        load();
        toast("Institucioni u fshi");
      },
    });
  }

  const totalOutstanding = data.reduce((s, i) => s + i.totalOutstanding, 0);

  return (
    <div className="flex flex-col">
      {confirmModal}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSaved={() => { load(); toast("Institucioni u krijua"); }} />}
      {editInst && <EditModal inst={editInst} onClose={() => setEditInst(null)} onSaved={() => { load(); toast("Institucioni u përditësua"); }} />}

      <Topbar title="Institucione Financiare" subtitle="Bankat dhe IFM-të partnere" />
      <div className="p-4 md:p-6 space-y-5">

        <div className="flex justify-end">
          {can("institution:create") && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors">
              <Plus size={14} /> Shto Institucion
            </button>
          )}
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map((inst) => {
              const share = totalOutstanding > 0 ? (inst.totalOutstanding / totalOutstanding) * 100 : 0;
              return (
                <div key={inst.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <span className="text-brand-700 text-[12px] font-bold">{inst.shortName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-semibold text-gray-900">{inst.name}</span>
                      <div className="text-[12px] text-gray-400 mt-0.5">
                        {inst.totalLoans} hua · {inst.activeCases} rast aktive
                      </div>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <div className="text-[11px] text-gray-400">Borxhi Aktual</div>
                      <div className="text-[16px] font-bold text-gray-900 tabular">{formatCurrency(inst.totalOutstanding)}</div>
                      <div className="text-[11px] text-gray-400">{share.toFixed(1)}% e portofolit</div>
                    </div>
                    {can("institution:edit") && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => setEditInst(inst)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Ndrysho">
                          <Pencil size={14} />
                        </button>
                        {can("institution:delete") && (
                          <button onClick={() => deleteInst(inst)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Fshi">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                  </div>
                </div>
              );
            })}
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
