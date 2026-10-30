"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { leave as leaveApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Check, X, Settings, ChevronDown, ChevronUp,
  Plus, Minus, AlertTriangle, Users, Clock, CheckCircle,
  ChevronLeft, Info,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Pushim Vjetor", SICK: "Pushim i Sëmurë", UNPAID: "Pushim pa Pagë",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    PENDING:   { label: "Në Pritje",  bg: "bg-amber-100",   text: "text-amber-700" },
    APPROVED:  { label: "Aprovuar",   bg: "bg-emerald-100", text: "text-emerald-700" },
    REJECTED:  { label: "Refuzuar",   bg: "bg-red-100",     text: "text-red-700" },
    CANCELLED: { label: "Anuluar",    bg: "bg-gray-100",    text: "text-gray-500" },
  };
  const m = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

// ── Review Modal ───────────────────────────────────────────────

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
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <CalendarDays size={15} className="text-brand-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Shqyrto Kërkesën</h3>
              <p className="text-[11px] text-gray-400">{request.user?.fullName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Request summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-900">{LEAVE_TYPE_LABELS[request.leaveType]}</span>
              <span className="text-[12px] font-semibold text-brand-700">{request.workingDays} ditë pune</span>
            </div>
            <div className="text-[12px] text-gray-500">
              {new Date(request.startDate).toLocaleDateString("sq-AL")}
              {" — "}
              {new Date(request.endDate).toLocaleDateString("sq-AL")}
            </div>
            {request.user?.office && (
              <div className="text-[11px] text-gray-400">{request.user.office.name}</div>
            )}
            {request.reason && (
              <div className="pt-2 mt-2 border-t border-gray-200 text-[12px] text-gray-600 italic">
                "{request.reason}"
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
              Shënim <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Shkruani shënim nëse dëshironi…"
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition resize-none" />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">
            Anulo
          </button>
          <button onClick={() => submit(false)} disabled={saving}
            className="px-4 py-2 flex items-center gap-2 text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors">
            <X size={14} /> Refuzo
          </button>
          <button onClick={() => submit(true)} disabled={saving}
            className="px-5 py-2 flex items-center gap-2 text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors">
            <Check size={14} /> Aprovo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Balance Modal ──────────────────────────────────────────────

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

  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

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
    if (!adjNote.trim()) { setError("Shkruani arsyen e rregullimit"); return; }
    const d = Number(adjDays);
    if (isNaN(d) || d === 0) { setError("Ditët duhet të jenë një numër jo-zero (mund të jetë negativ)"); return; }
    setSaving(true); setError("");
    try {
      await leaveApi.createAdjustment(userId, d, adjNote);
      onDone();
    } catch (e: any) {
      setError(e.message ?? "Gabim gjatë ruajtjes");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-brand-700 text-[12px] font-bold">{initials}</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">{userName}</h3>
              <p className="text-[11px] text-gray-400">Menaxho bilancin e pushimeve</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100">
          {(["balance", "adjustment"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-3 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t === "balance" ? "Bilanci Fillestar" : "Rregullim Manual"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {tab === "balance" ? (
            <>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Data Fillestare e Akumulimit</label>
                <input type="date" value={initialDate} onChange={e => setInitialDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:border-brand-400 transition-colors" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Ditë Fillestare</label>
                <input type="number" value={initialDays} onChange={e => setInitialDays(e.target.value)}
                  step="0.5" min="0"
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition" />
              </div>
              <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Nga kjo datë sistemi shton automatikisht <strong>+1.5 ditë çdo muaj</strong>.
                  Në fund të Qershorit, bilancet mbi 6 ditë nuk transferohen.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Ditë (+/-)</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjDays(d => {
                      const n = parseFloat(d) || 0;
                      return String(-n);
                    })}
                    className="w-9 h-9 shrink-0 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                    {adjDays.startsWith("-") ? <Plus size={15} /> : <Minus size={15} />}
                  </button>
                  <input type="number" value={adjDays} onChange={e => setAdjDays(e.target.value)}
                    step="0.5" placeholder="0"
                    className="flex-1 h-9 px-3 bg-white border border-gray-300 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Vlera pozitive shton ditë, negative zbritet.
                </p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  Arsyeja <span className="text-red-500">*</span>
                </label>
                <textarea value={adjNote} onChange={e => setAdjNote(e.target.value)} rows={2}
                  placeholder="Shkruani arsyen e rregullimit…"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition resize-none" />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">
            Anulo
          </button>
          <button onClick={tab === "balance" ? saveBalance : saveAdj} disabled={saving}
            className="px-5 py-2 flex items-center gap-2 text-[13px] font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl transition-colors">
            {saving ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg> Duke ruajtur…</>
            ) : "Ruaj Ndryshimet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff row ──────────────────────────────────────────────────

function StaffRow({ item, onManage }: { item: any; onManage: (item: any) => void }) {
  const [open, setOpen] = useState(false);
  const b = item.balance;
  const initials = item.user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const totalEarned = b.hasBalance ? (b.initialDays + b.accrued + (b.adjustmentsTotal ?? 0)) : 0;
  const usedPct = totalEarned > 0 ? Math.min(100, (b.usedAnnual / totalEarned) * 100) : 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-4 px-4 py-3">

        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <span className="text-brand-700 text-[12px] font-bold">{initials}</span>
        </div>

        {/* Info */}
        <div className={`flex-1 min-w-0 ${b.hasBalance ? "cursor-pointer" : ""}`} onClick={() => b.hasBalance && setOpen(o => !o)}>
          <div className="text-[13px] font-semibold text-gray-900">{item.user.fullName}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {item.user.office?.name ?? "—"} · #{item.user.userCode}
          </div>
        </div>

        {/* Balance display */}
        <div className="hidden md:block w-40 shrink-0" onClick={() => b.hasBalance && setOpen(o => !o)}>
          {b.hasBalance ? (
            <div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>{b.usedAnnual} shfrytëzuara</span>
                <span className="font-semibold text-brand-700">{b.balance} disponueshme</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              Pa bilans
            </span>
          )}
        </div>

        {/* Available days large */}
        <div className={`text-right w-16 shrink-0 ${b.hasBalance ? "cursor-pointer" : ""}`} onClick={() => b.hasBalance && setOpen(o => !o)}>
          {b.hasBalance ? (
            <>
              <div className="text-[20px] font-bold text-brand-700 leading-none tabular">{b.balance}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">ditë</div>
            </>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center ml-auto">
              <AlertTriangle size={14} className="text-amber-500" />
            </div>
          )}
        </div>

        {/* Manage button */}
        <button onClick={() => onManage(item)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-colors shrink-0"
          title="Menaxho bilancin">
          <Settings size={14} />
        </button>

        {/* Expand toggle */}
        {b.hasBalance && (
          <button onClick={() => setOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {open && b.hasBalance && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Bilanci Fillestar",  val: `${b.initialDays} ditë` },
              { label: "Të Akumuluara",      val: `+${b.accrued} ditë` },
              { label: "Pushim Vjetor",      val: `${b.usedAnnual} ditë` },
              { label: "Pushim Sëmurë",      val: `${b.usedSick} ditë` },
              { label: "Pa Pagë",            val: `${b.usedUnpaid} ditë` },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <div className="text-[13px] font-semibold text-gray-700 tabular">{val}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          {(b.adjustmentsTotal ?? 0) !== 0 && (
            <div className="mt-2.5 text-[11px] text-gray-400 text-center">
              Rregullime manuale: <strong className="text-gray-600">{b.adjustmentsTotal > 0 ? "+" : ""}{b.adjustmentsTotal} ditë</strong>
            </div>
          )}
          {b.pendingAnnualDays > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-600">
              <Clock size={11} />
              <span>{b.pendingAnnualDays} ditë rezervuara në kërkesat aktive</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main admin page ────────────────────────────────────────────

type Tab = "pending" | "staff";

export default function LeaveAdminPage() {
  const { can }   = useAuth();
  const router    = useRouter();

  const [pending, setPending]     = useState<any[]>([]);
  const [staff, setStaff]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<Tab>("pending");
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

  const noBalance = staff.filter(s => !s.balance.hasBalance).length;

  return (
    <>
      <Topbar title="Menaxhimi i Pushimeve" subtitle="Aprovo kërkesat dhe menaxho bilancet e stafit" />

      <div className="p-4 md:p-6 space-y-5">

        {/* Back link */}
        <a href="/leave"
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft size={14} /> Kthehu te pushimet e mia
        </a>

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Kërkesa në Pritje",  val: pending.length,                                            icon: Clock },
              { label: "Anëtarë Stafi",       val: staff.length,                                              icon: Users },
              { label: "Pa Bilans",           val: noBalance,                                                 icon: AlertTriangle },
              { label: "Aprovuara (total)",   val: staff.reduce((s, x) => s + (x.balance.usedAnnual ?? 0), 0), icon: CheckCircle },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-col justify-between"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-tight">{label}</div>
                <div className="flex items-end justify-between mt-2">
                  <div className="text-[28px] font-bold text-gray-900 tabular leading-none">{val}</div>
                  <Icon size={16} className="text-gray-300 shrink-0 mb-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar + content */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-5">
            {([
              { key: "pending" as Tab, label: "Kërkesat",  badge: pending.length },
              { key: "staff"   as Tab, label: "Stafi",     badge: null },
            ]).map(({ key, label, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {label}
                {badge != null && badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === key ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4 md:p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tab === "pending" ? (
              pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                    <CheckCircle size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-600">Nuk ka kërkesa në pritje</p>
                  <p className="text-[12px] text-gray-400 mt-1">Të gjitha kërkesat janë procesuar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map(r => (
                    <div key={r.id} className="flex items-center gap-4 px-4 py-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors bg-white"
                      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 text-brand-700 text-[11px] font-bold">
                        {r.user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-gray-900">{r.user.fullName}</span>
                          <span className="text-[10px] text-gray-400">#{r.user.userCode}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded border border-brand-200 text-[11px] font-medium bg-brand-50 text-brand-700">
                            {LEAVE_TYPE_LABELS[r.leaveType]}
                          </span>
                        </div>
                        <div className="text-[12px] text-gray-600 mt-1">
                          {new Date(r.startDate).toLocaleDateString("sq-AL")}
                          {" — "}
                          {new Date(r.endDate).toLocaleDateString("sq-AL")}
                          <span className="text-gray-400"> · {r.workingDays} ditë pune</span>
                        </div>
                        {r.user.office && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{r.user.office.name}</div>
                        )}
                        {r.reason && (
                          <div className="text-[11px] text-gray-400 mt-0.5 italic">"{r.reason}"</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => leaveApi.reviewRequest(r.id, false).then(load).catch((e: any) => alert(e.message))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          title="Refuzo">
                          <X size={14} />
                        </button>
                        <button
                          onClick={() => setReviewing(r)}
                          className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors">
                          Shqyrto
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Staff tab */
              <div className="space-y-2">
                {noBalance > 0 && (
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-700">
                      <strong>{noBalance} anëtar{noBalance !== 1 ? "ë" : ""} stafi</strong> nuk kanë bilans të konfiguruar — klikoni ⚙ për të vendosur.
                    </p>
                  </div>
                )}
                {staff.map(item => (
                  <StaffRow key={item.user.id} item={item} onManage={setManaging} />
                ))}
              </div>
            )}
          </div>
        </div>
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
