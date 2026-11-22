"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { leave as leaveApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  CalendarDays, Plus, X, Clock, CheckCircle, XCircle, Ban,
  AlertTriangle, ChevronRight, Info, ChevronDown, Stethoscope,
  Wallet, History,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: "ANNUAL",  label: "Pushim Vjetor",   desc: "Zbritet nga bilanci juaj vjetor",  color: "brand" },
  { value: "sick",    label: "Pushim i Sëmurë", desc: "Nuk zbritet — vetëm shënohet",    color: "amber" },
  { value: "UNPAID",  label: "Pushim pa Pagë",  desc: "Pa pagesë — nuk zbritet",         color: "gray"  },
] as const;

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  PENDING:   { label: "Në Pritje",  bg: "bg-amber-100",   text: "text-amber-700",   icon: Clock },
  APPROVED:  { label: "Aprovuar",   bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle },
  REJECTED:  { label: "Refuzuar",   bg: "bg-red-100",     text: "text-red-700",     icon: XCircle },
  CANCELLED: { label: "Anuluar",    bg: "bg-gray-100",    text: "text-gray-500",    icon: Ban },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.PENDING;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${m.bg} ${m.text}`}>
      <Icon size={10} />
      {m.label}
    </span>
  );
}

function LeaveTypeBadge({ type }: { type: string }) {
  const t = LEAVE_TYPES.find(x => x.value === type);
  const colors: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    gray:  "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${colors[t?.color ?? "gray"]}`}>
      {t?.label ?? type}
    </span>
  );
}

// ── Balance card ───────────────────────────────────────────────

function BalanceCard({ balance }: { balance: any }) {
  if (!balance) return null;

  if (!balance.hasBalance) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <div className="text-[14px] font-semibold text-amber-800">Bilanci nuk është konfiguruar</div>
          <div className="text-[12px] text-amber-600 mt-0.5">
            Kontaktoni administratorin për të vendosur bilancin tuaj fillestar të pushimeve.
          </div>
        </div>
      </div>
    );
  }

  const totalEarned = balance.initialDays + balance.accrued + (balance.adjustmentsTotal ?? 0);
  const usedPct = totalEarned > 0 ? Math.min(100, (balance.usedAnnual / totalEarned) * 100) : 0;

  // June forfeiture warning
  const now = new Date();
  const isPreJune = now.getMonth() < 5; // before June
  const showJuneWarning = isPreJune && balance.balance > 9;
  const forfeitDays = balance.balance - 9;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>

      {/* Top row */}
      <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-5 border-b border-gray-100">
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Disponueshme</div>
          <div className="text-[36px] font-bold text-brand-700 leading-none tabular">
            {balance.balance - balance.pendingAnnualDays}
          </div>
          <div className="text-[12px] text-gray-400 mt-1">ditë</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pushim Vjetor</div>
          <div className="text-[24px] font-semibold text-gray-700 leading-none tabular">{balance.usedAnnual}</div>
          <div className="text-[11px] text-gray-400 mt-1">ditë shfrytëzuara</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pushim Sëmurë</div>
          <div className="text-[24px] font-semibold text-gray-700 leading-none tabular">{balance.usedSick}</div>
          <div className="text-[11px] text-gray-400 mt-1">ditë të regjistruara</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pa Pagë</div>
          <div className="text-[24px] font-semibold text-gray-700 leading-none tabular">{balance.usedUnpaid}</div>
          <div className="text-[11px] text-gray-400 mt-1">ditë të regjistruara</div>
        </div>
      </div>

      {/* Progress + meta */}
      <div className="px-6 py-4 space-y-3">
        <div className="flex items-center justify-between text-[12px] text-gray-500 mb-1.5">
          <span>{balance.usedAnnual} ditë shfrytëzuara</span>
          <span>{totalEarned} ditë totale të fituara</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${usedPct}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-gray-400">
          <span>Fillestar: <strong className="text-gray-600">{balance.initialDays} ditë</strong></span>
          <span>Akumulim: <strong className="text-gray-600">+{balance.accrued} ditë</strong></span>
          {balance.adjustmentsTotal !== 0 && (
            <span>Rregullime: <strong className="text-gray-600">{balance.adjustmentsTotal > 0 ? "+" : ""}{balance.adjustmentsTotal}</strong></span>
          )}
          <span>+1.5 ditë/muaj nga <strong className="text-gray-600">{new Date(balance.initialDate).toLocaleDateString("sq-AL")}</strong></span>
        </div>
        {balance.pendingAnnualDays > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-700">
            <Clock size={13} className="shrink-0" />
            <span><strong>{balance.pendingAnnualDays} ditë</strong> rezervuara — kërkesat tuaja aktive presin aprovim</span>
          </div>
        )}
      </div>

      {/* June warning */}
      {showJuneWarning && (
        <div className="mx-6 mb-4 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-[12px] text-red-700 leading-relaxed">
            <strong>Kujdes — Rregulli i Qershorit:</strong> Bilancet mbi 9 ditë nuk transferohen pas Qershorit.
            Nëse nuk i shfrytëzoni, do të humbni <strong>{forfeitDays} ditë</strong> të grumbulluara.
          </div>
        </div>
      )}

      {/* Info row */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
        <Info size={12} className="shrink-0" />
        <span>Vetëm Pushimi Vjetor zbritet nga bilanci. Pushimi i Sëmurë dhe Pa Pagë regjistrohen si shënime.</span>
      </div>
    </div>
  );
}

// ── Request modal ──────────────────────────────────────────────

function RequestModal({ balance, onClose, onSuccess }: { balance: any; onClose: () => void; onSuccess: () => void }) {
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [reason, setReason]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const available = balance?.hasBalance ? (balance.balance - balance.pendingAnnualDays) : 0;

  async function submit() {
    if (!startDate || !endDate) { setError("Zgjidhni datën e fillimit dhe mbarimit"); return; }
    if (new Date(endDate) < new Date(startDate)) { setError("Data e mbarimit nuk mund të jetë para datës së fillimit"); return; }
    setSaving(true); setError("");
    try {
      await leaveApi.createRequest({ leaveType, startDate, endDate, reason: reason || undefined });
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Ndodhi një gabim gjatë dërgimit të kërkesës");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <CalendarDays size={15} className="text-brand-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Kërko Pushim</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Plotësoni të dhënat e pushimit</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Leave type */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-2.5">Lloji i Pushimit</label>
            <div className="space-y-2">
              {LEAVE_TYPES.map(t => (
                <button key={t.value} onClick={() => setLeaveType(t.value)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    leaveType === t.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}>
                  <div className="flex-1">
                    <div className={`text-[13px] font-semibold ${leaveType === t.value ? "text-brand-700" : "text-gray-800"}`}>
                      {t.label}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{t.desc}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    leaveType === t.value ? "border-brand-600 bg-brand-600" : "border-gray-300"
                  }`}>
                    {leaveType === t.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Data e Fillimit</label>
              <div className="relative">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:border-brand-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Data e Mbarimit</label>
              <div className="relative">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:border-brand-400 transition-colors" />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
              Arsyeja <span className="text-gray-400 font-normal">(opsionale)</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Shkruani arsyen nëse dëshironi…"
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition resize-none" />
          </div>

          {/* Balance indicator */}
          {leaveType === "ANNUAL" && balance?.hasBalance && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-[12px] text-gray-600">Bilanci aktual i disponueshëm</span>
              <span className={`text-[13px] font-bold ${available <= 0 ? "text-red-600" : "text-brand-700"}`}>
                {available} ditë
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">
            Anulo
          </button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg> Duke dërguar…</>
            ) : (
              <><CalendarDays size={14} /> Dërgo Kërkesën</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Type icon ──────────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
  if (type === "ANNUAL")
    return (
      <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
        <CalendarDays size={15} className="text-brand-600" />
      </div>
    );
  if (type === "SICK")
    return (
      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
        <Stethoscope size={15} className="text-amber-500" />
      </div>
    );
  return (
    <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
      <Wallet size={15} className="text-gray-400" />
    </div>
  );
}

// ── Year group ─────────────────────────────────────────────────

function YearGroup({
  year, rows, onCancel, isCurrentYear,
}: {
  year: number;
  rows: any[];
  onCancel: (id: string) => void;
  isCurrentYear: boolean;
}) {
  const [open, setOpen] = useState(isCurrentYear);

  const annualDays  = rows.filter(r => r.leaveType === "ANNUAL"  && r.status === "APPROVED").reduce((s, r) => s + r.workingDays, 0);
  const sickDays    = rows.filter(r => r.leaveType === "SICK"    && r.status === "APPROVED").reduce((s, r) => s + r.workingDays, 0);
  const unpaidDays  = rows.filter(r => r.leaveType === "UNPAID"  && r.status === "APPROVED").reduce((s, r) => s + r.workingDays, 0);
  const pendingRows = rows.filter(r => r.status === "PENDING");

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" });

  return (
    <div>
      {/* Year divider row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100/60 transition-colors group"
      >
        <span className="text-[13px] font-bold text-gray-700">{year}</span>

        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {annualDays > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
              <CalendarDays size={10} />
              {annualDays} ditë vjetore
            </span>
          )}
          {sickDays > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              <Stethoscope size={10} />
              {sickDays} ditë sëmundje
            </span>
          )}
          {unpaidDays > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
              <Wallet size={10} />
              {unpaidDays} pa pagë
            </span>
          )}
          {pendingRows.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
              <Clock size={10} />
              {pendingRows.length} në pritje
            </span>
          )}
          {annualDays === 0 && sickDays === 0 && unpaidDays === 0 && pendingRows.length === 0 && (
            <span className="text-[11px] text-gray-400">{rows.length} kërkesa</span>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`text-gray-400 group-hover:text-gray-600 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Rows */}
      {open && (
        <div className="divide-y divide-gray-50">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
              <TypeIcon type={r.leaveType} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <LeaveTypeBadge type={r.leaveType} />
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-gray-700 font-medium">
                  <span>{fmtDate(r.startDate)}</span>
                  <span className="text-gray-300">→</span>
                  <span>{fmtDate(r.endDate)}</span>
                  <span className="text-gray-400 font-normal ml-0.5">· {r.workingDays} {r.workingDays === 1 ? "ditë" : "ditë"} pune</span>
                </div>
                {r.reviewNote && (
                  <div className="text-[11px] text-gray-400 mt-1 flex items-start gap-1">
                    <span className="shrink-0 mt-px">↳</span>
                    <span>{r.reviewNote}</span>
                  </div>
                )}
                {r.reason && !r.reviewNote && (
                  <div className="text-[11px] text-gray-400 mt-1 italic">"{r.reason}"</div>
                )}
              </div>

              <div className="text-right shrink-0 space-y-1">
                <div className="text-[11px] text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                {r.status === "PENDING" && (
                  <button
                    onClick={() => onCancel(r.id)}
                    className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    Anulo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── History section ────────────────────────────────────────────

function HistorySection({
  requests, loading, onCancel, onNewRequest, canRequest,
}: {
  requests: any[];
  loading: boolean;
  onCancel: (id: string) => void;
  onNewRequest: () => void;
  canRequest: boolean;
}) {
  const [filter, setFilter] = useState<string>("all");

  const FILTER_OPTIONS = [
    { key: "all",       label: "Të gjitha" },
    { key: "PENDING",   label: "Në Pritje" },
    { key: "APPROVED",  label: "Aprovuara" },
    { key: "REJECTED",  label: "Refuzuara" },
  ] as const;

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "PENDING").length;
  const currentYear = new Date().getFullYear();

  // Group filtered rows by year (descending)
  const byYear = filtered.reduce<Record<number, any[]>>((acc, r) => {
    const y = new Date(r.startDate).getFullYear();
    if (!acc[y]) acc[y] = [];
    acc[y].push(r);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <History size={14} className="text-gray-500" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">Historia e Pushimeve</h2>
            {!loading && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                {requests.length === 0 ? "Nuk ka kërkesa" : `${requests.length} ${requests.length === 1 ? "kërkesë" : "kërkesa"} gjithsej`}
              </p>
            )}
          </div>
        </div>
        {canRequest && (
          <button onClick={onNewRequest}
            className="flex items-center gap-2 h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-xl transition-colors">
            <Plus size={14} />
            Kërko Pushim
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-100 px-5 overflow-x-auto">
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              filter === key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {label}
            {key === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-36 bg-gray-100 rounded" />
                <div className="h-2.5 w-24 bg-gray-100 rounded" />
              </div>
              <div className="w-14 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <CalendarDays size={20} className="text-gray-300" />
          </div>
          <p className="text-[13px] font-medium text-gray-400">
            {filter === "all" ? "Nuk keni kërkesa pushimi" : "Nuk ka kërkesa me këtë status"}
          </p>
          {filter === "all" && canRequest && (
            <button onClick={onNewRequest}
              className="mt-4 flex items-center gap-2 h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium rounded-xl transition-colors">
              <Plus size={14} /> Kërko pushimin e parë
            </button>
          )}
        </div>
      ) : (
        <div>
          {years.map(year => (
            <YearGroup
              key={year}
              year={year}
              rows={byYear[year]}
              onCancel={onCancel}
              isCurrentYear={year === currentYear}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function LeavePage() {
  const { can, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [balance, setBalance]     = useState<any>(null);
  const [requests, setRequests]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try {
      const [bal, reqs] = await Promise.all([leaveApi.myBalance(), leaveApi.myRequests()]);
      setBalance(bal);
      setRequests(reqs);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => {
    if (user?.role === "ADMIN") { router.replace("/leave/admin"); return; }
    load();
  }, [user]);

  async function cancelReq(id: string) {
    if (!confirm("A jeni sigurt që doni të anuloni këtë kërkesë?")) return;
    try {
      await leaveApi.cancelRequest(id);
      load();
      toast("Kërkesa u anulua");
    } catch (e: any) { toast(e.message ?? "Gabim gjatë anulimit", "error"); }
  }

  return (
    <>
      <Topbar title="Pushimet e Mia" subtitle="Apliko dhe shiko gjendjen e pushimeve vjetore" help={[
        { title: "Sa ditë pushim kam të disponueshme?", body: "Kartela në krye tregon ditët e mbetura, ditët e shfrytëzuara dhe bilancin e plotë. Ditët 'në pritje' janë rezervuara nga kërkesat tuaja aktive që nuk janë aprovuar ende — nuk i keni ende, por janë mbajtur si rezervë." },
        { title: "Si të aplikoni për pushim", body: "Klikoni butonin 'Kërko Pushim' në krye. Zgjidhni llojin (vjetor, mjekësor etj.), datën e fillimit dhe mbarimit, dhe shtoni arsyen nëse dëshironi. Pas dërgimit, kërkesa shkon te menaxheri/administratori për aprovim — nuk mund të filloni pushimin pa aprovim." },
        { title: "Statuset e kërkesës", body: "Në Pritje = kërkesa u dërgua dhe pret vendim. E Aprovuar = aprovuar, mund të shkoni në pushim. E Refuzuar = nuk u aprovuar — menaxheri mund të ketë lënë një shënim me arsyen. E Anuluar = ju vetë e keni anuluar para aprovimit." },
        { title: "Si të anuloni një kërkesë", body: "Nëse keni ndryshuar mendim dhe kërkesa është ende 'Në Pritje', klikoni butonin 'Anulo' pranë kërkesës. Nuk mund të anuloni një kërkesë tashmë të aprovuar — kontaktoni menaxherin direkt." },
        { title: "Paralajmërimi i qershorit", body: "Nëse po afrohemi fundit të qershorit dhe keni mbi 9 ditë pushim të pashfrytëzuara, sistemi ju paralajmëron. Kjo është sepse ditët e tepërta mbi 9 mund të humbasin pas datës 30 qershor — planifikoni pushimet tuaja në kohë." },
        { title: "Historia e pushimeve", body: "Seksioni 'Historia e Pushimeve' tregon të gjitha kërkesat tuaja të grupuara sipas vitit. Klikoni mbi vitin për të shpalosur ose fshehur detajet. Çdo grup viti tregon sa ditë vjetore, sëmundjeje dhe pa pagë janë shfrytëzuar atë vit." },
      ]} />

      <div className="p-4 md:p-6 space-y-5">

        {/* Balance */}
        {loading ? (
          <div className="h-44 bg-white border border-gray-200 rounded-2xl animate-pulse" />
        ) : (
          <BalanceCard balance={balance} />
        )}

        {/* Admin link */}
        {can("leave:admin") && (
          <a href="/leave/admin"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:bg-gray-50 hover:border-brand-200 transition-all group"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <CalendarDays size={16} className="text-brand-600" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-900">Menaxhimi i Pushimeve</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Aprovo kërkesat dhe menaxho bilancet e stafit</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-medium text-brand-600 group-hover:text-brand-700">
              Hap <ChevronRight size={14} />
            </div>
          </a>
        )}

        {/* History */}
        <HistorySection
          requests={requests}
          loading={loading}
          onCancel={cancelReq}
          onNewRequest={() => setShowModal(true)}
          canRequest={can("page:leave")}
        />

      </div>

      {showModal && (
        <RequestModal
          balance={balance}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); toast("Kërkesa u dërgua me sukses"); }}
        />
      )}
    </>
  );
}
