"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { leave as leaveApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, X, Settings, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Pushim Vjetor",
  SICK: "Pushim i Sëmurë",
  UNPAID: "Pushim pa Pagë",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-700",
  APPROVED:  "bg-emerald-100 text-emerald-700",
  REJECTED:  "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Në Pritje", APPROVED: "Aprovuar", REJECTED: "Refuzuar", CANCELLED: "Anuluar",
};

// ── Review Modal ──────────────────────────────────────────────
function ReviewModal({ request, onClose, onDone }: { request: any; onClose: () => void; onDone: () => void }) {
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function submit(approved: boolean) {
    setSaving(true); setError("");
    try {
      await leaveApi.reviewRequest(request.id, approved, note || undefined);
      onDone();
    } catch (e: any) {
      setError(e.message ?? "Gabim gjatë procesimit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-900">Shqyrto Kërkesën</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
            <div className="text-[13px] font-semibold text-gray-900">{request.user?.fullName}</div>
            <div className="text-[12px] text-gray-500">
              {LEAVE_TYPE_LABELS[request.leaveType]} · {request.workingDays} ditë pune
            </div>
            <div className="text-[12px] text-gray-500">
              {new Date(request.startDate).toLocaleDateString("sq-AL")} — {new Date(request.endDate).toLocaleDateString("sq-AL")}
            </div>
            {request.reason && (
              <div className="text-[12px] text-gray-600 pt-1 border-t border-gray-200">"{request.reason}"</div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Shënim (opsional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Shkruani shënim nëse dëshironi…"
              className="input-field text-[13px] resize-none" />
          </div>

          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Anulo</button>
          <button onClick={() => submit(false)} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            <X size={14} /> Refuzo
          </button>
          <button onClick={() => submit(true)} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            <Check size={14} /> Aprovo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Balance Setup Modal ───────────────────────────────────────
function BalanceModal({ userId, userName, current, onClose, onDone }: {
  userId: string; userName: string; current: any; onClose: () => void; onDone: () => void;
}) {
  const [initialDays, setInitialDays] = useState(String(current?.initialDays ?? "0"));
  const [initialDate, setInitialDate] = useState(current?.initialDate?.split("T")[0] ?? "");
  const [adjDays, setAdjDays]         = useState("");
  const [adjNote, setAdjNote]         = useState("");
  const [tab, setTab]                 = useState<"balance" | "adjustment">("balance");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  async function saveBalance() {
    if (!initialDate) { setError("Zgjidhni datën fillestare"); return; }
    setSaving(true); setError("");
    try {
      await leaveApi.setBalance(userId, Number(initialDays), initialDate);
      onDone();
    } catch (e: any) {
      setError(e.message ?? "Gabim gjatë ruajtjes");
    } finally { setSaving(false); }
  }

  async function saveAdj() {
    if (!adjNote.trim()) { setError("Shkruani arsyen për rregullimin"); return; }
    const d = Number(adjDays);
    if (isNaN(d) || d === 0) { setError("Ditët duhet të jenë një numër jo-zero"); return; }
    setSaving(true); setError("");
    try {
      await leaveApi.createAdjustment(userId, d, adjNote);
      onDone();
    } catch (e: any) {
      setError(e.message ?? "Gabim gjatë ruajtjes");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Bilanci: {userName}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab("balance")}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${tab === "balance" ? "text-brand-700 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
            Bilanci Fillestar
          </button>
          <button onClick={() => setTab("adjustment")}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${tab === "adjustment" ? "text-brand-700 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
            Rregullim Manual
          </button>
        </div>

        <div className="p-5 space-y-4">
          {tab === "balance" ? (
            <>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Data Fillestare</label>
                <input type="date" value={initialDate} onChange={e => setInitialDate(e.target.value)}
                  className="input-field text-[13px]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Ditë Fillestare</label>
                <input type="number" value={initialDays} onChange={e => setInitialDays(e.target.value)}
                  step="0.5" min="0" className="input-field text-[13px]" />
              </div>
              <div className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                Nga kjo datë, sistemi do të shtojë +1.5 ditë çdo muaj automatikisht.
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Ditë (+/-)</label>
                <div className="flex gap-2">
                  <button onClick={() => setAdjDays(d => d.startsWith("-") ? d.slice(1) : "-" + (d || "0"))}
                    className="w-9 h-9 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 shrink-0">
                    {adjDays.startsWith("-") ? <Plus size={14} /> : <Minus size={14} />}
                  </button>
                  <input type="number" value={adjDays} onChange={e => setAdjDays(e.target.value)}
                    step="0.5" placeholder="0" className="input-field text-[13px] flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Arsyeja *</label>
                <textarea value={adjNote} onChange={e => setAdjNote(e.target.value)} rows={2}
                  placeholder="Shkruani arsyen e rregullimit…"
                  className="input-field text-[13px] resize-none" />
              </div>
            </>
          )}

          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Anulo</button>
          <button onClick={tab === "balance" ? saveBalance : saveAdj} disabled={saving} className="btn-primary">
            {saving ? "Duke ruajtur…" : "Ruaj"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff Row ─────────────────────────────────────────────────
function StaffRow({ item, onManage }: { item: any; onManage: (item: any) => void }) {
  const [open, setOpen] = useState(false);
  const b = item.balance;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 text-brand-700 text-[12px] font-bold">
          {item.user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-gray-900">{item.user.fullName}</div>
          <div className="text-[11px] text-gray-400">{item.user.office?.name ?? "—"} · #{item.user.userCode}</div>
        </div>
        <div className="text-right shrink-0">
          {b.hasBalance ? (
            <>
              <div className="text-[18px] font-bold text-brand-700 leading-none">{b.balance}</div>
              <div className="text-[10px] text-gray-400">ditë</div>
            </>
          ) : (
            <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pa bilans</span>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onManage(item); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
          <Settings size={14} />
        </button>
        {open ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
      </button>

      {open && b.hasBalance && (
        <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-center bg-gray-50">
          <div>
            <div className="text-[16px] font-semibold text-gray-800">{b.initialDays}</div>
            <div className="text-[10px] text-gray-400">Bilanci Fillestar</div>
          </div>
          <div>
            <div className="text-[16px] font-semibold text-gray-800">+{b.accrued}</div>
            <div className="text-[10px] text-gray-400">Të Akumuluara</div>
          </div>
          <div>
            <div className="text-[16px] font-semibold text-gray-800">{b.usedAnnual}</div>
            <div className="text-[10px] text-gray-400">Pushim Vjetor</div>
          </div>
          <div>
            <div className="text-[16px] font-semibold text-gray-800">{b.usedSick}</div>
            <div className="text-[10px] text-gray-400">Pushim i Sëmurë</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LeaveAdminPage() {
  const { can } = useAuth();
  const router  = useRouter();

  const [pending, setPending]   = useState<any[]>([]);
  const [staff, setStaff]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"pending" | "staff">("pending");
  const [reviewing, setReviewing] = useState<any>(null);
  const [managing, setManaging]   = useState<any>(null);

  useEffect(() => {
    if (!can("leave:admin")) { router.push("/leave"); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([leaveApi.adminPending(), leaveApi.adminStaff()]);
      setPending(p);
      setStaff(s);
    } catch {} finally { setLoading(false); }
  }

  return (
    <>
      <Topbar title="Menaxhimi i Pushimeve" subtitle="Aprovoni kërkesat dhe menaxhoni bilancet" />

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab("pending")}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === "pending" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Kërkesat ({pending.length})
          </button>
          <button onClick={() => setTab("staff")}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === "staff" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Stafi ({staff.length})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-16" />)}
          </div>
        ) : tab === "pending" ? (
          pending.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <CalendarDays size={28} className="text-gray-300 mx-auto mb-2" />
              <div className="text-[13px] font-medium text-gray-500">Nuk ka kërkesa në pritje</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 text-brand-700 text-[11px] font-bold">
                    {r.user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-gray-900">{r.user.fullName}</span>
                      <span className="text-[10px] text-gray-400">#{r.user.userCode}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">Në Pritje</span>
                    </div>
                    <div className="text-[12px] text-gray-600 mt-0.5">
                      {LEAVE_TYPE_LABELS[r.leaveType]} · {r.workingDays} ditë pune
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(r.startDate).toLocaleDateString("sq-AL")} — {new Date(r.endDate).toLocaleDateString("sq-AL")}
                      {r.user.office && ` · ${r.user.office.name}`}
                    </div>
                    {r.reason && <div className="text-[11px] text-gray-400 mt-0.5 italic">"{r.reason}"</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setReviewing(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12px] font-medium hover:bg-brand-700 transition-colors">
                      Shqyrto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2">
            {staff.map(item => (
              <StaffRow key={item.user.id} item={item} onManage={setManaging} />
            ))}
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); }}
        />
      )}

      {managing && (
        <BalanceModal
          userId={managing.user.id}
          userName={managing.user.fullName}
          current={managing.balance.hasBalance ? managing.balance : null}
          onClose={() => setManaging(null)}
          onDone={() => { setManaging(null); load(); }}
        />
      )}
    </>
  );
}
