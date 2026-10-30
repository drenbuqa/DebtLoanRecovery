"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { leave as leaveApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CalendarDays, Plus, X, Clock, CheckCircle, XCircle, AlertTriangle, Ban } from "lucide-react";

const LEAVE_TYPES = [
  { value: "ANNUAL",  label: "Pushim Vjetor",   desc: "Zbritet nga bilanci juaj" },
  { value: "SICK",    label: "Pushim i Sëmurë", desc: "Vetëm shënime, nuk zbritet" },
  { value: "UNPAID",  label: "Pushim pa Pagë",  desc: "Pa pagesë, vetëm shënime" },
];

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:   { label: "Në Pritje",  color: "bg-amber-100 text-amber-700",   icon: Clock },
  APPROVED:  { label: "Aprovuar",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  REJECTED:  { label: "Refuzuar",   color: "bg-red-100 text-red-700",        icon: XCircle },
  CANCELLED: { label: "Anuluar",    color: "bg-gray-100 text-gray-500",      icon: Ban },
};

function BalanceCard({ balance }: { balance: any }) {
  if (!balance) return null;
  if (!balance.hasBalance) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <div className="text-[14px] font-semibold text-amber-800">Bilanci nuk është konfiguruar</div>
          <div className="text-[12px] text-amber-600 mt-0.5">Kontaktoni administratorin për të vendosur bilancin fillestar.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-gray-900">Gjendja e Pushimeve</h3>
        <div className="text-[11px] text-gray-400">
          Nga {balance.initialDate ? new Date(balance.initialDate).toLocaleDateString("sq-AL") : "—"}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <div className="text-[28px] font-bold text-brand-700 leading-none">{balance.balance}</div>
          <div className="text-[11px] font-medium text-brand-600 mt-1">Ditë të Disponueshme</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-[24px] font-semibold text-gray-700 leading-none">{balance.usedAnnual}</div>
          <div className="text-[11px] text-gray-500 mt-1">Ditë të Shfrytëzuara</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-[24px] font-semibold text-gray-700 leading-none">{balance.usedSick}</div>
          <div className="text-[11px] text-gray-500 mt-1">Pushim i Sëmurë</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-[24px] font-semibold text-gray-700 leading-none">{balance.usedUnpaid}</div>
          <div className="text-[11px] text-gray-500 mt-1">Pushim pa Pagë</div>
        </div>
      </div>

      {balance.pendingAnnualDays > 0 && (
        <div className="mt-3 text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          ⚠️ {balance.pendingAnnualDays} ditë në pritje aprovimi — janë rezervuar nga bilanci juaj
        </div>
      )}

      <div className="mt-4 text-[11px] text-gray-400">
        Bilanci fillestar: {balance.initialDays} ditë · Të akumuluara: +{balance.accrued} ditë
        {balance.adjustmentsTotal !== 0 && ` · Rregullime: ${balance.adjustmentsTotal > 0 ? "+" : ""}${balance.adjustmentsTotal}`}
      </div>
    </div>
  );
}

function RequestModal({ balance, onClose, onSuccess }: { balance: any; onClose: () => void; onSuccess: () => void }) {
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [reason, setReason]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function submit() {
    if (!startDate || !endDate) { setError("Zgjidhni datat e pushimit"); return; }
    setSaving(true); setError("");
    try {
      await leaveApi.createRequest({ leaveType, startDate, endDate, reason: reason || undefined });
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Gabim gjatë dërgimit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-900">Kërko Pushim</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Leave type */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Lloji i Pushimit</label>
            <div className="grid grid-cols-1 gap-2">
              {LEAVE_TYPES.map(t => (
                <button key={t.value} onClick={() => setLeaveType(t.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${leaveType === t.value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="flex-1">
                    <div className={`text-[13px] font-semibold ${leaveType === t.value ? "text-brand-700" : "text-gray-800"}`}>
                      {t.label}
                    </div>
                    <div className="text-[11px] text-gray-400">{t.desc}</div>
                  </div>
                  {leaveType === t.value && <CheckCircle size={16} className="text-brand-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">Data e Fillimit</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="input-field text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">Data e Mbarimit</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                min={startDate}
                className="input-field text-[13px]" />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Arsyeja (opsionale)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Shkruani arsyen nëse dëshironi…"
              className="input-field text-[13px] resize-none" />
          </div>

          {leaveType === "ANNUAL" && balance?.hasBalance && (
            <div className="text-[12px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Bilanci aktual: <strong className="text-gray-900">{balance.balance - balance.pendingAnnualDays} ditë</strong> të disponueshme
            </div>
          )}

          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Anulo</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? "Duke dërguar…" : "Dërgo Kërkesën"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeavePage() {
  const { can } = useAuth();
  const [balance, setBalance]   = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try {
      const [bal, reqs] = await Promise.all([leaveApi.myBalance(), leaveApi.myRequests()]);
      setBalance(bal);
      setRequests(reqs);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function cancelReq(id: string) {
    if (!confirm("A jeni sigurt që doni të anuloni këtë kërkesë?")) return;
    try {
      await leaveApi.cancelRequest(id);
      load();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <>
      <Topbar title="Pushimet e Mia" subtitle="Apliko dhe shiko gjendjen e pushimeve" />

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        {/* Balance card */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-32" />
        ) : (
          <BalanceCard balance={balance} />
        )}

        {/* Request button */}
        {can("page:leave") && (
          <div className="flex justify-end">
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={15} />
              Kërko Pushim
            </button>
          </div>
        )}

        {/* Admin link */}
        {can("leave:admin") && (
          <a href="/leave/admin"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <CalendarDays size={15} className="text-brand-600" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-900">Menaxhimi i Pushimeve</div>
                <div className="text-[11px] text-gray-400">Aprovo kërkesat dhe menaxho bilancet e stafit</div>
              </div>
            </div>
            <span className="text-[12px] text-brand-600 font-medium">Hap →</span>
          </a>
        )}

        {/* Request history */}
        <div>
          <h3 className="text-[13px] font-semibold text-gray-700 mb-3">Historia e Kërkesave</h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-16" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <CalendarDays size={28} className="text-gray-300 mx-auto mb-2" />
              <div className="text-[13px] text-gray-400">Nuk keni kërkesa pushimi</div>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(r => {
                const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                const Icon = meta.icon;
                const typeMeta = LEAVE_TYPES.find(t => t.value === r.leaveType);
                return (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <CalendarDays size={16} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-gray-900">{typeMeta?.label ?? r.leaveType}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${meta.color}`}>
                          <Icon size={10} className="inline mr-0.5 -mt-px" />{meta.label}
                        </span>
                      </div>
                      <div className="text-[12px] text-gray-500 mt-0.5">
                        {new Date(r.startDate).toLocaleDateString("sq-AL")} — {new Date(r.endDate).toLocaleDateString("sq-AL")} · {r.workingDays} ditë pune
                      </div>
                      {r.reviewNote && (
                        <div className="text-[11px] text-gray-400 mt-0.5">Shënim: {r.reviewNote}</div>
                      )}
                    </div>
                    {r.status === "PENDING" && (
                      <button onClick={() => cancelReq(r.id)}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium shrink-0">
                        Anulo
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <RequestModal
          balance={balance}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </>
  );
}
