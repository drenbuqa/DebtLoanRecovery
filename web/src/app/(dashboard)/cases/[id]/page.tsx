"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  cases as casesApi,
  activities as activitiesApi,
  payments as paymentsApi,
  agreements as agreementsApi,
  documents as docsApi,
  users as usersApi,
  offices as officesApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { formatCurrency, formatEnum } from "@/lib/utils";
import {
  ChevronLeft, Phone, MessageSquare, MapPin, CreditCard,
  FileText, CheckSquare, Clock, Scale, RefreshCw,
  MoreHorizontal, Plus, Upload, Circle, CheckCircle2, X, Trash2, Download, ClipboardList,
} from "lucide-react";

// ── Shared empty state ───────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }: {
  icon: any; title: string; description?: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Icon size={22} className="text-gray-400" />
      </div>
      <div>
        <div className="text-[13px] font-semibold text-gray-700 mb-1">{title}</div>
        {description && <div className="text-[12px] text-gray-400 max-w-xs">{description}</div>}
      </div>
      {action && (
        <button onClick={action.onClick}
          className="mt-1 px-4 py-2 text-[12px] font-medium text-brand-700 border border-brand-200 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ── Activity icon map ───────────────────────────────────────
const ACT_ICON: Record<string, any> = {
  CALL: Phone, VISIT: MapPin, FIELD_VISIT: MapPin, SMS: Phone,
  EMAIL: Phone, LETTER: Phone, PROMISE_TO_PAY: CheckSquare,
  PAYMENT_RECEIVED: CreditCard, LEGAL_ACTION: Scale, NOTE: FileText,
};
const ACT_LABEL: Record<string, string> = {
  CALL: "Kontakt", VISIT: "Vizitë", FIELD_VISIT: "Vizitë", SMS: "Kontakt",
  EMAIL: "Kontakt", LETTER: "Kontakt", PROMISE_TO_PAY: "Premtim Pagese",
  PAYMENT_RECEIVED: "Pagesë e Regjistruar", LEGAL_ACTION: "Veprim Juridik", NOTE: "Shënim",
};

// ── Status dot ──────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-400", SUSPENDED: "bg-amber-400",
  LEGAL: "bg-red-400", CLOSED: "bg-gray-300", WRITTEN_OFF: "bg-gray-400",
};
const STAGE_DOT: Record<string, string> = {
  D1: "bg-amber-300", D2: "bg-amber-400", D3: "bg-red-400",
  D4: "bg-red-500", LEGAL: "bg-brand-500", WRITTEN_OFF: "bg-gray-400",
};

// ── Tabs ────────────────────────────────────────────────────
const TABS = ["Pasqyrë", "Financiar", "Pagesa", "Marrëveshjet", "Juridike", "Dokumenta"];

// ── Activity type options ─────────────────────────────────────
const ACT_TYPE_OPTIONS = [
  { value: "CALL",             label: "Kontakt" },
  { value: "VISIT",            label: "Vizitë" },
  { value: "PROMISE_TO_PAY",   label: "Premtim Pagese" },
  { value: "PAYMENT_RECEIVED", label: "Pagesë e Regjistruar" },
  { value: "NOTE",             label: "Shënim" },
];

// ── Outcome options — only for types where outcome is meaningful ──
const OUTCOME_OPTIONS: Record<string, { value: string; label: string }[]> = {
  CALL: [
    { value: "NO_ANSWER",        label: "Nuk Është Përgjigjur" },
    { value: "CONTACTED",        label: "Kontaktuar — Pa Premtim" },
    { value: "PROMISE_RECEIVED", label: "Kontaktuar — Me Premtim" },
    { value: "REFUSED",          label: "Kontaktuar — Ka Refuzuar" },
    { value: "DISPUTE",          label: "Kontaktuar — Ka Kundërshtuar" },
    { value: "DECEASED",         label: "I/E Ndjerë" },
  ],
  VISIT: [
    { value: "NO_ANSWER",        label: "Nuk Ishte në Shtëpi" },
    { value: "CONTACTED",        label: "Kontaktuar — Pa Premtim" },
    { value: "PROMISE_RECEIVED", label: "Kontaktuar — Me Premtim" },
    { value: "REFUSED",          label: "Kontaktuar — Ka Refuzuar" },
    { value: "DISPUTE",          label: "Kontaktuar — Ka Kundërshtuar" },
  ],
  PAYMENT_RECEIVED: [
    { value: "FULL_PAYMENT",    label: "Pagesë e Plotë" },
    { value: "PARTIAL_PAYMENT", label: "Pagesë e Pjesshme" },
  ],
};

const PROMISE_TYPES = new Set(["PROMISE_TO_PAY", "CALL", "VISIT"]);
const FOLLOWUP_TYPES = new Set(["CALL", "VISIT"]);

// ── Modal: Log Activity ──────────────────────────────────────
function LogActivityModal({ caseId, onClose, onSuccess }: { caseId: string; onClose: () => void; onSuccess: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState("");
  const [activityDate, setActivityDate] = useState(today);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleTypeChange(t: string) {
    setType(t);
    setOutcome("");
    setPromiseAmount("");
    setPromiseDate("");
    setNextDate("");
  }

  const outcomeOptions = OUTCOME_OPTIONS[type] ?? [];
  const showPromise = PROMISE_TYPES.has(type) &&
    (type === "PROMISE_TO_PAY" || outcome === "PROMISE_RECEIVED");
  const showFollowup = FOLLOWUP_TYPES.has(type) && !showPromise;

  // Map VISIT to FIELD_VISIT is not needed; VISIT covers both
  const backendType = type;

  async function submit() {
    if (!type) { setError("Zgjidhni llojin e aktivitetit"); return; }
    if (outcomeOptions.length > 0 && !outcome) { setError("Zgjidhni rezultatin"); return; }
    if (!notes.trim()) { setError("Shënimet janë të detyrueshme"); return; }
    setLoading(true); setError("");
    try {
      await activitiesApi.log(caseId, {
        activityType: backendType,
        outcome: outcome || undefined,
        notes,
        occurredAt: activityDate || undefined,
        promiseAmount: promiseAmount ? parseFloat(promiseAmount) : undefined,
        nextActionDate: (showPromise && promiseDate) ? promiseDate : (showFollowup && nextDate) ? nextDate : undefined,
      });
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Regjistro Aktivitet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}

          {/* Type + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Lloji i Aktivitetit <span className="text-red-500">*</span></label>
              <Select value={type} onChange={handleTypeChange} placeholder="Zgjidhni llojin…" options={ACT_TYPE_OPTIONS} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data</label>
              <DatePicker value={activityDate} onChange={setActivityDate} placeholder="Sot" />
            </div>
          </div>

          {/* Outcome — only for call, visit, payment */}
          {outcomeOptions.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Rezultati <span className="text-red-500">*</span></label>
              <Select value={outcome} onChange={setOutcome} placeholder="Zgjidhni rezultatin…" options={outcomeOptions} />
            </div>
          )}

          {/* Promise fields */}
          {showPromise && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shuma e Premtimit (€)</label>
                <input type="number" min="0" step="0.01" value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data e Premtimit</label>
                <DatePicker value={promiseDate} onChange={setPromiseDate} placeholder="Zgjidhni datën" />
              </div>
            </div>
          )}

          {/* Next follow-up */}
          {showFollowup && (
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Ndjekja e Radhës</label>
              <DatePicker value={nextDate} onChange={setNextDate} placeholder="Zgjidhni datën" />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shënime <span className="text-red-500">*</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Çfarë ndodhi?"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors resize-none" />
          </div>
        </div>
        <div className="px-6 pb-5 pt-1 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Anulo</button>
          <button onClick={submit} disabled={loading}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {loading ? "Duke ruajtur…" : "Regjistro Aktivitet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Add Payment ───────────────────────────────────────
function AddPaymentModal({ caseId, onClose, onSuccess }: { caseId: string; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!amount || parseFloat(amount) <= 0) { setError("Vendosni një shumë të vlefshme"); return; }
    setLoading(true); setError("");
    try {
      await paymentsApi.register({ caseId, amount: parseFloat(amount), paymentMethod: method, paymentDate: date, notes });
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-modal-in modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Regjistro Pagesë</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shuma (€) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus
              className="w-full px-3 py-2.5 text-[17px] font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors tabular" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Metoda</label>
              <Select value={method} onChange={setMethod} options={[
                { value: "CASH", label: "Kesh" },
                { value: "BANK_TRANSFER", label: "Transfer Bankar" },
                { value: "CHECK", label: "Çek" },
                { value: "ONLINE", label: "Online" },
                { value: "OTHER", label: "Tjetër" },
              ]} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shënim</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referencë (opsionale)"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Anulo</button>
          <button onClick={submit} disabled={loading}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {loading ? "Duke ruajtur…" : "Regjistro Pagesën"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Create Agreement ──────────────────────────────────
function CreateAgreementModal({ caseId, onClose, onSuccess }: { caseId: string; onClose: () => void; onSuccess: () => void }) {
  const [total, setTotal] = useState("");
  const [count, setCount] = useState("6");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const monthly = total && count ? (parseFloat(total) / parseInt(count)).toFixed(2) : "0.00";

  async function submit() {
    if (!total || parseFloat(total) <= 0) { setError("Vendosni një shumë totale të vlefshme"); return; }
    setLoading(true); setError("");
    try {
      await agreementsApi.create({ caseId, totalAmount: parseFloat(total), installmentCount: parseInt(count), startDate: start, notes });
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-modal-in modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Krijo Marrëveshje</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shuma Totale (€) *</label>
            <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" autoFocus
              className="w-full px-3 py-2.5 text-[17px] font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Këste</label>
              <Select value={count} onChange={setCount}
                options={[3,6,9,12,18,24,36].map((n) => ({ value: String(n), label: `${n} muaj` }))} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Këst Mujor</label>
              <div className="px-3 py-2 text-[15px] font-bold text-gray-800 tabular">€{monthly}</div>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data e Fillimit</label>
            <DatePicker value={start} onChange={setStart} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shënime</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kushte (opsionale)"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Anulo</button>
          <button onClick={submit} disabled={loading}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {loading ? "Duke krijuar…" : "Krijo Marrëveshje"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── More actions dropdown ────────────────────────────────────
function MoreMenu({ onAgreement, onStatusUpdate, onEdit }: { onAgreement?: () => void; onStatusUpdate?: () => void; onEdit?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    ...(onEdit ? [{ label: "Ndrysho Detajet e Dosjes", action: onEdit }] : []),
    ...(onStatusUpdate ? [{ label: "Ndrysho Statusin / Fazën", action: onStatusUpdate }] : []),
    ...(onAgreement ? [{ label: "Krijo Marrëveshje", action: onAgreement }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40 w-48">
          {items.map((it) => (
            <button key={it.label} onClick={() => { it.action(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = params?.id as string;
  const { user, can } = useAuth();
  const [confirmModal, openConfirm] = useConfirm();
  const { toast } = useToast();

  const initialTab = TABS.includes(searchParams?.get("tab") ?? "") ? (searchParams!.get("tab") as string) : "Pasqyrë";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [caseData, setCaseData] = useState<any>(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Documents
  const [docs, setDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState("OTHER");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showLogActivity, setShowLogActivity] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: "", collectionStage: "", note: "" });
  const [statusSaving, setStatusSaving] = useState(false);

  const [showEditCase, setShowEditCase] = useState(false);
  const [editOfficers, setEditOfficers] = useState<any[]>([]);
  const [editOffices, setEditOffices] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function openEditCase() {
    const [u, o] = await Promise.all([
      usersApi.list({ isActive: true }),
      officesApi.list(),
    ]);
    setEditOfficers((u as any[]).filter((u: any) => u.role === "OFFICER" || u.role === "MANAGER"));
    setEditOffices(o as any[]);
    setEditForm({
      assignedOfficerId: caseData?.assignedOfficer?.id ?? "",
      officeId: caseData?.officeId ?? "",
      currentOutstandingBalance: caseData?.loan?.currentOutstandingBalance ?? "",
      maturityDate: caseData?.loan?.maturityDate ? caseData.loan.maturityDate.slice(0, 10) : "",
      interestRate: caseData?.loan?.interestRate ?? "",
      productType: caseData?.loan?.productType ?? "",
      nplClassification: caseData?.loan?.nplClassification ?? "",
    });
    setEditError("");
    setShowEditCase(true);
  }

  async function saveEditCase() {
    setEditSaving(true); setEditError("");
    try {
      await casesApi.update(caseId, {
        assignedOfficerId: editForm.assignedOfficerId || null,
        officeId: editForm.officeId || null,
        currentOutstandingBalance: editForm.currentOutstandingBalance !== "" ? parseFloat(editForm.currentOutstandingBalance) : undefined,
        maturityDate: editForm.maturityDate || null,
        interestRate: editForm.interestRate !== "" ? parseFloat(editForm.interestRate) : undefined,
        productType: editForm.productType || undefined,
        nplClassification: editForm.nplClassification || undefined,
      });
      await loadCase();
      setShowEditCase(false);
      toast("Dosja u përditësua");
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  }

  async function loadCase() {
    if (!caseId) { setLoadingCase(false); return; }
    setCaseError(null);
    try {
      const c = await casesApi.get(caseId);
      setCaseData(c);
    } catch (e: any) {
      setCaseError(e.message ?? "Gabim gjatë ngarkimit të dosjes");
    } finally { setLoadingCase(false); }
  }

  useEffect(() => { loadCase(); }, [caseId]);

  async function loadDocs() {
    if (!caseId) return;
    setDocsLoading(true);
    try { setDocs(await docsApi.listByCase(caseId)); } catch {} finally { setDocsLoading(false); }
  }

  useEffect(() => {
    if (activeTab === "Dokumenta") loadDocs();
  }, [activeTab, caseId]);

  async function submitUpload() {
    if (!uploadFile) { setUploadError("Ju lutem zgjidhni një skedar."); return; }
    setUploading(true); setUploadError("");
    try {
      const doc = await docsApi.upload(caseId, uploadFile, uploadType, uploadNotes || undefined);
      setDocs((prev) => [doc, ...prev]);
      setShowUpload(false); setUploadFile(null); setUploadType("OTHER"); setUploadNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast("Dokumenti u ngarkua");
    } catch (e: any) { setUploadError(e.message); }
    finally { setUploading(false); }
  }

  async function downloadDoc(docId: string, fileName: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"}/documents/${docId}/download`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  function deleteDoc(docId: string) {
    openConfirm({
      title: "Fshi dokumentin",
      message: "Ky dokument do të fshihet përgjithmonë dhe nuk mund të rikuperohet.",
      confirmLabel: "Fshi",
      variant: "danger",
      onConfirm: async () => {
        await docsApi.delete(docId);
        setDocs((prev) => prev.filter((d) => d.id !== docId));
      },
    });
  }

  async function submitStatusUpdate() {
    if (!statusForm.status && !statusForm.collectionStage) return;
    setStatusSaving(true);
    try {
      await casesApi.updateStatus(caseId, statusForm);
      setShowStatusUpdate(false);
      setStatusForm({ status: "", collectionStage: "", note: "" });
      await loadCase();
      toast("Statusi u përditësua");
    } catch (e: any) { alert(e.message); } finally { setStatusSaving(false); }
  }

  // Derived values
  const debtor = caseData
    ? `${caseData.loan?.borrower?.firstName ?? ""} ${caseData.loan?.borrower?.lastName ?? ""}`.trim()
    : "Duke ngarkuar…";
  const outstanding = Number(caseData?.loan?.currentOutstandingBalance ?? 0);
  const dpd = caseData?.loan?.daysPastDue ?? 0;
  const status = caseData?.status ?? "—";
  const stage = caseData?.collectionStage ?? "—";
  const institution = caseData?.loan?.institution?.name ?? "—";
  const loanNumber = caseData?.loan?.loanNumber ?? "—";
  const caseRef = caseData?.caseReference ?? "—";
  const office = caseData?.office?.name ?? "—";
  const officer = caseData?.assignedOfficer?.fullName ?? "Pa caktuar";
  const activities = caseData?.activities ?? [];
  const payments = caseData?.payments ?? [];
  const agreements = caseData?.agreements ?? [];
  const parties = caseData
    ? [
        { name: debtor, role: "Debitor", personalId: caseData.loan?.borrower?.personalId, phone: caseData.loan?.borrower?.phones?.[0]?.phoneNumber, address: caseData.loan?.borrower?.address },
        ...(caseData.loan?.relatedParties ?? []).map((rp: any) => ({
          name: `${rp.person?.firstName} ${rp.person?.lastName}`, role: rp.role,
          personalId: rp.person?.personalId, phone: rp.person?.phones?.[0]?.phoneNumber, address: "",
        })),
      ]
    : [];

  // Recovery metrics
  const totalCollected = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const disbursed = Number(caseData?.loan?.disbursedAmount ?? 0);
  const recoveryRate = disbursed > 0 ? ((totalCollected / disbursed) * 100).toFixed(1) : "0.0";
  const lastPayment = [...payments].sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];
  const daysSincePay = lastPayment ? Math.floor((Date.now() - new Date(lastPayment.paymentDate).getTime()) / 86400000) : null;

  if (loadingCase) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar dosjen…
      </div>
    );
  }

  if (caseError || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <X size={22} className="text-red-400" />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-gray-800 mb-1">Dosja nuk u gjet</div>
          <div className="text-[13px] text-gray-400 max-w-xs">{caseError ?? "Kjo dosje nuk ekziston ose nuk keni akses."}</div>
        </div>
        <button onClick={() => router.push("/cases")}
          className="px-4 py-2 text-[13px] font-medium text-brand-700 border border-brand-200 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors">
          ← Kthehu te dosjet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Modals */}
      {confirmModal}
      {showLogActivity && <LogActivityModal caseId={caseId} onClose={() => setShowLogActivity(false)} onSuccess={() => { loadCase(); toast("Aktiviteti u regjistrua"); }} />}
      {showAddPayment && <AddPaymentModal caseId={caseId} onClose={() => setShowAddPayment(false)} onSuccess={() => { loadCase(); toast("Pagesa u regjistrua"); }} />}
      {showAgreement && <CreateAgreementModal caseId={caseId} onClose={() => setShowAgreement(false)} onSuccess={() => { loadCase(); toast("Marrëveshja u krijua"); }} />}

      {showStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop" onClick={() => setShowStatusUpdate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-modal-in modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Ndrysho Statusin / Fazën</h2>
              <button onClick={() => setShowStatusUpdate(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Statusi i Dosjes</label>
                <Select value={statusForm.status} onChange={(v) => setStatusForm(f => ({ ...f, status: v }))}
                  placeholder="Pa ndryshim"
                  options={["ACTIVE","SUSPENDED","LEGAL","CLOSED","WRITTEN_OFF"].map((s) => ({ value: s, label: formatEnum(s) }))} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Faza e Arkëtimit</label>
                <Select value={statusForm.collectionStage} onChange={(v) => setStatusForm(f => ({ ...f, collectionStage: v }))}
                  placeholder="Pa ndryshim"
                  options={["D1","D2","D3","D4","LEGAL","WRITTEN_OFF"].map((s) => ({ value: s, label: formatEnum(s) }))} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shënim</label>
                <textarea value={statusForm.note} onChange={(e) => setStatusForm(f => ({ ...f, note: e.target.value }))} rows={2}
                  placeholder="Arsyeja e ndryshimit…"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={() => setShowStatusUpdate(false)} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Anulo</button>
              <button onClick={submitStatusUpdate} disabled={statusSaving}
                className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {statusSaving ? "Duke ruajtur…" : "Përditëso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Case modal ── */}
      {showEditCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop" onClick={() => setShowEditCase(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-modal-in modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Ndrysho Detajet e Dosjes</h2>
              <button onClick={() => setShowEditCase(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{editError}</div>}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Oficer i Caktuar</label>
                  <Select value={editForm.assignedOfficerId ?? ""} onChange={(v) => setEditForm((f: any) => ({ ...f, assignedOfficerId: v }))}
                    placeholder="Pa caktuar"
                    options={editOfficers.map((o) => ({ value: o.id, label: o.fullName }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Zyra</label>
                  <Select value={editForm.officeId ?? ""} onChange={(v) => setEditForm((f: any) => ({ ...f, officeId: v }))}
                    placeholder="Pa zyrë specifike"
                    options={editOffices.map((o: any) => ({ value: o.id, label: o.name }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Gjendja Debitore (EUR)</label>
                  <input type="number" min="0" step="0.01" value={editForm.currentOutstandingBalance}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, currentOutstandingBalance: e.target.value }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data e Maturimit</label>
                  <DatePicker value={editForm.maturityDate} onChange={(v) => setEditForm((f: any) => ({ ...f, maturityDate: v }))} placeholder="Zgjidhni datën" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Norma e Interesit (%)</label>
                  <input type="number" min="0" step="0.01" value={editForm.interestRate}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, interestRate: e.target.value }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Klasifikimi NPL</label>
                  <Select value={editForm.nplClassification ?? ""} onChange={(v) => setEditForm((f: any) => ({ ...f, nplClassification: v }))}
                    dropUp placeholder="Asnjë"
                    options={[
                      { value: "PERFORMING",  label: "Performues" },
                      { value: "WATCH",       label: "Nën Vëzhgim" },
                      { value: "SUBSTANDARD", label: "Nënstandard" },
                      { value: "DOUBTFUL",    label: "I Dyshimtë" },
                      { value: "LOSS",        label: "Humbje" },
                    ]} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Lloji i Produktit</label>
                <input value={editForm.productType}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, productType: e.target.value }))}
                  placeholder="p.sh. Kredi Konsumatore, Hipotekë…"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
              </div>
            </div>
            <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowEditCase(false)} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Anulo</button>
              <button onClick={saveEditCase} disabled={editSaving}
                className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {editSaving ? "Duke ruajtur…" : "Ruaj Ndryshimet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Case header ── */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 pt-4 pb-0">

        {/* Back + actions row */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push("/cases")}
            className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={14} /> Dosjet
          </button>
          <div className="flex-1" />
          {(can("agreement:create") || can("case:edit")) && (
            <MoreMenu
              onEdit={can("case:edit") ? openEditCase : undefined}
              onStatusUpdate={can("case:edit") ? () => { setStatusForm({ status: status, collectionStage: stage, note: "" }); setShowStatusUpdate(true); } : undefined}
              onAgreement={can("agreement:create") ? () => setShowAgreement(true) : undefined}
            />
          )}
          {can("payment:create") && (
            <button onClick={() => setShowAddPayment(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <CreditCard size={13} /> <span className="hidden md:inline">Shto Pagesë</span>
            </button>
          )}
          {can("activity:create") && (
            <button onClick={() => setShowLogActivity(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors">
              <ClipboardList size={13} /> <span className="hidden md:inline">Regjistro Aktivitet</span>
            </button>
          )}
        </div>

        {/* Debtor + status + key numbers */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-6 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-[20px] font-bold text-gray-900">{debtor}</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-gray-100 text-gray-600">
                <span className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[stage] ?? "bg-gray-300"}`} />
                {formatEnum(stage)}
              </span>
              {status !== "ACTIVE" && status !== stage && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-gray-100 text-gray-600">
                  {formatEnum(status)}
                </span>
              )}
              {caseData?.loan?.nplClassification && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                  NPL · {formatEnum(caseData.loan.nplClassification)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[12.5px] text-gray-400 flex-wrap">
              <span className="font-mono">{caseData?.loan?.borrower?.personalId ?? "—"}</span>
              <span className="text-gray-200">·</span>
              <span>{institution}</span>
              <span className="font-mono text-gray-500">{loanNumber}</span>
              <span className="text-gray-200">·</span>
              <span className="font-mono text-gray-500">{caseRef}</span>
              <span className="text-gray-200">·</span>
              <span>{office}</span>
              <span className="text-gray-200">·</span>
              <span>{officer}</span>
            </div>
          </div>

          {/* Key numbers */}
          <div className="flex items-center gap-5 shrink-0 self-start md:self-auto">
            <div className="text-right">
              <div className="text-[11px] text-gray-400 mb-0.5">Gjendja Debitore</div>
              <div className="text-[22px] font-bold text-gray-900 tabular leading-none">{formatCurrency(outstanding)}</div>
            </div>
            <div className="w-px h-9 bg-gray-200" />
            <div className="text-right">
              <div className="text-[11px] text-gray-400 mb-0.5">Ditë Vonesë</div>
              <div className={`text-[18px] font-bold tabular leading-none ${dpd > 180 ? "text-red-600" : dpd > 90 ? "text-amber-600" : "text-gray-800"}`}>{dpd}d</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0.5 -mb-px overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t ? "text-brand-700 border-brand-600" : "text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 p-4 md:p-6">

        {/* OVERVIEW */}
        {activeTab === "Pasqyrë" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {/* Timeline */}
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-[13px] font-semibold text-gray-900">Kronologjia e Dosjes</h3>
              </div>
              {activities.length === 0 ? (
                <EmptyState icon={Clock} title="Nuk ka aktivitete" description="Regjistroni një telefonatë, vizitë ose shënim për të filluar kronologjinë e dosjes." action={{ label: "Regjistro Aktivitet", onClick: () => setShowLogActivity(true) }} />
              ) : (
                <div className="divide-y divide-gray-50">
                  {activities.map((a: any, i: number) => {
                    const Icon = ACT_ICON[a.activityType] ?? Clock;
                    const label = ACT_LABEL[a.activityType] ?? a.activityType;
                    const dateStr = a.occurredAt ?? a.date;
                    return (
                      <div key={a.id ?? i} className="flex gap-3.5 px-5 py-3.5">
                        <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon size={13} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold text-gray-700">{label}</span>
                            <span className="text-[11px] text-gray-400">{a.officer?.fullName ?? a.user ?? ""}</span>
                          </div>
                          <p className="text-[12.5px] text-gray-600 leading-snug">{a.notes ?? a.text}</p>
                          {a.outcome && <p className="text-[11px] text-gray-400 mt-0.5">{formatEnum(a.outcome)}</p>}
                        </div>
                        <div className="text-[11px] text-gray-400 shrink-0 mt-0.5">
                          {dateStr ? new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Case stats — real data */}
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h3 className="text-[12px] font-semibold text-gray-900 mb-3">Përmbledhje e Dosjes</h3>
                <div className="space-y-2.5">
                  {[
                    { label: "Dosja u hap", val: caseData?.createdAt ? new Date(caseData.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                    { label: "Shuma e disbursuar", val: formatCurrency(disbursed) },
                    { label: "Gjendja debitore", val: formatCurrency(outstanding) },
                    { label: "Totali i arkëtuar", val: formatCurrency(totalCollected) },
                    { label: "Shkalla e arkëtimit", val: `${recoveryRate}%` },
                    { label: "Ditë nga pagesa e fundit", val: daysSincePay != null ? `${daysSincePay} ditë` : "—" },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-baseline">
                      <span className="text-[12px] text-gray-400">{r.label}</span>
                      <span className="text-[12.5px] font-semibold text-gray-800 tabular">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contacts */}
              {parties.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <h3 className="text-[12px] font-semibold text-gray-900 mb-3">Kontaktet</h3>
                  <div className="space-y-3">
                    {parties.slice(0, 3).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-gray-500 text-[10px] font-bold">
                            {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-gray-900 truncate">{p.name}</div>
                          <div className="text-[11px] text-gray-400">{p.role}{p.phone ? ` · ${p.phone}` : ""}</div>
                        </div>
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0">
                            <Phone size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FINANCIAL */}
        {activeTab === "Financiar" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: "Kredia Origjinale", val: formatCurrency(Number(caseData?.loan?.originalLoanAmount ?? 0)) },
                { label: "E Disbursuar", val: formatCurrency(disbursed) },
                { label: "Gjendja Debitore", val: formatCurrency(outstanding) },
                { label: "Totali i Arkëtuar", val: formatCurrency(totalCollected) },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div className="text-[11px] text-gray-400">{s.label}</div>
                  <div className="text-[18px] font-bold text-gray-900 tabular mt-0.5">{s.val}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h3 className="text-[12px] font-semibold text-gray-900 mb-3">Detajet e Kredisë</h3>
                <div className="space-y-2.5">
                  {[
                    { label: "Numër Kredie", val: loanNumber },
                    { label: "Institucioni", val: institution },
                    { label: "Lloji i Produktit", val: caseData?.loan?.productType ?? "—" },
                    { label: "Norma e Interesit", val: caseData?.loan?.interestRate != null ? `${caseData.loan.interestRate}%` : "—" },
                    { label: "Data e Disbursimit", val: caseData?.loan?.disbursementDate ? new Date(caseData.loan.disbursementDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                    { label: "Data e Maturimit", val: caseData?.loan?.maturityDate ? new Date(caseData.loan.maturityDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                    { label: "Ditë Vonesë", val: `${dpd} ditë` },
                    { label: "Klasifikimi NPL", val: caseData?.loan?.nplClassification ? formatEnum(caseData.loan.nplClassification) : "—" },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-baseline">
                      <span className="text-[12px] text-gray-400">{r.label}</span>
                      <span className="text-[12.5px] font-semibold text-gray-800 tabular">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h3 className="text-[12px] font-semibold text-gray-900 mb-3">Arkëtimi</h3>
                <div className="space-y-2.5">
                  {[
                    { label: "Totali i Arkëtuar", val: formatCurrency(totalCollected) },
                    { label: "Shkalla e Arkëtimit", val: `${recoveryRate}%` },
                    { label: "Numri i Pagesave", val: `${payments.length}` },
                    { label: "Shuma e Pagesës së Fundit", val: lastPayment ? formatCurrency(Number(lastPayment.amount)) : "—" },
                    { label: "Ditë nga Pagesa e Fundit", val: daysSincePay != null ? `${daysSincePay} ditë` : "—" },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-baseline">
                      <span className="text-[12px] text-gray-400">{r.label}</span>
                      <span className="text-[12.5px] font-semibold text-gray-800 tabular">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === "Pagesa" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-gray-900">Historia e Pagesave</h3>
                <button onClick={() => setShowAddPayment(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[12px] font-medium hover:bg-brand-700 transition-colors">
                  <Plus size={12} /> Shto Pagesë
                </button>
              </div>
              {payments.length === 0 ? (
                <EmptyState icon={CreditCard} title="Nuk ka pagesa" description="Regjistroni një pagesë për të filluar gjurmimin e arkëtimeve për këtë dosje." action={{ label: "Shto Pagesë", onClick: () => setShowAddPayment(true) }} />
              ) : (
                <Table>
                  <Thead><tr><Th>Referenca</Th><Th>Data</Th><Th>Shuma</Th><Th>Metoda</Th><Th>Shënim</Th></tr></Thead>
                  <Tbody>
                    {payments.map((p: any) => (
                      <Tr key={p.id}>
                        <Td><span className="font-mono text-[12px] text-gray-500">{p.paymentReference}</span></Td>
                        <Td><span className="tabular text-[12px]">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></Td>
                        <Td><span className="font-semibold text-gray-900 tabular">{formatCurrency(Number(p.amount))}</span></Td>
                        <Td><span className="text-[12px] text-gray-500">{formatEnum(p.paymentMethod)}</span></Td>
                        <Td><span className="text-[12px] text-gray-400">{p.notes ?? "—"}</span></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* AGREEMENTS */}
        {activeTab === "Marrëveshjet" && (
          <div className="space-y-4">
            {agreements.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200">
                <EmptyState icon={FileText} title="Nuk ka marrëveshje" description="Krijoni një marrëveshje ripagimi për të vendosur një plan këstesh për këtë debitor." action={{ label: "Krijo Marrëveshje", onClick: () => setShowAgreement(true) }} />
              </div>
            ) : agreements.map((a: any) => {
              const paid = a.installments?.filter((i: any) => i.status === "PAID").length ?? 0;
              const total = a.installments?.length ?? a.installmentCount;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-semibold text-gray-900 font-mono">{a.agreementReference}</span>
                      <span className="text-[12px] text-gray-400 ml-3">{formatCurrency(Number(a.totalAmount))} · {total} këste</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">{paid}/{total} paguar</span>
                      <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400 rounded-full" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                  {a.installments && (
                    <Table>
                      <Thead><tr><Th>#</Th><Th>Data e Skadimit</Th><Th>Shuma</Th><Th>Paguar</Th><Th>Statusi</Th></tr></Thead>
                      <Tbody>
                        {a.installments.map((ins: any) => (
                          <Tr key={ins.id}>
                            <Td><span className="tabular text-gray-500">{ins.installmentNumber}</span></Td>
                            <Td><span className="tabular text-[12px]">{ins.dueDate ? new Date(ins.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></Td>
                            <Td><span className="tabular">{formatCurrency(Number(ins.amount))}</span></Td>
                            <Td><span className={`tabular font-semibold ${ins.paidAmount > 0 ? "text-gray-800" : "text-gray-300"}`}>{formatCurrency(Number(ins.paidAmount ?? 0))}</span></Td>
                            <Td>
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                                <span className={`w-1.5 h-1.5 rounded-full ${ins.status === "PAID" ? "bg-emerald-400" : ins.status === "OVERDUE" ? "bg-red-400" : "bg-gray-300"}`} />
                                {formatEnum(ins.status)}
                              </span>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* LEGAL */}
        {activeTab === "Juridike" && (() => {
          const lp: any[] = caseData?.legalProceedings ?? [];
          const LEGAL_STATUS_DOT: Record<string, string> = {
            ACTIVE: "bg-emerald-400", PENDING: "bg-amber-400", CLOSED: "bg-gray-300",
            JUDGMENT: "bg-red-400", APPEAL: "bg-amber-400", SETTLED: "bg-gray-300",
          };
          return (
            <div className="space-y-4">
              {lp.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200">
                  <EmptyState icon={Scale} title="Nuk ka procedime juridike" description="Veprimet juridike të iniciuara për këtë dosje do të shfaqen këtu." />
                </div>
              ) : lp.map((p: any) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[13px] font-semibold text-gray-900 font-mono">{p.proceedingRef}</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${LEGAL_STATUS_DOT[p.status] ?? "bg-gray-300"}`} />
                        {formatEnum(p.status)}
                      </span>
                    </div>
                    {p.court && <span className="text-[12px] text-gray-400">{p.court}</span>}
                  </div>
                  <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {[
                      { label: "Data e Depozitimit", val: p.filingDate ? new Date(p.filingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                      { label: "Seanca Tjetër", val: p.nextHearingDate ? new Date(p.nextHearingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                      { label: "Data e Vendimit", val: p.judgmentDate ? new Date(p.judgmentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                      { label: "Shuma e Vendimit", val: p.judgmentAmount ? formatCurrency(Number(p.judgmentAmount)) : "—" },
                    ].map((r) => (
                      <div key={r.label}>
                        <div className="text-[11px] text-gray-400 mb-1">{r.label}</div>
                        <div className="text-[13px] font-semibold text-gray-800 tabular">{r.val}</div>
                      </div>
                    ))}
                  </div>
                  {p.notes && (
                    <div className="px-5 pb-4 border-t border-gray-50 pt-3">
                      <div className="text-[11px] text-gray-400 mb-1">Shënime</div>
                      <p className="text-[13px] text-gray-700 leading-snug">{p.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* DOCUMENTS */}
        {activeTab === "Dokumenta" && (
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Upload modal */}
            {showUpload && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop" onClick={() => setShowUpload(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in modal-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold text-gray-900">Ngarko Dokument</h2>
                    <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    {uploadError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{uploadError}</div>}
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Skedari <span className="text-red-500">*</span></label>
                      <input ref={fileInputRef} type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="w-full text-[13px] text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
                      {uploadFile && <p className="mt-1 text-[11px] text-gray-400">{(uploadFile.size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Lloji i Dokumentit</label>
                      <Select value={uploadType} onChange={setUploadType} options={[
                        { value: "CONTRACT", label: "Kontratë" },
                        { value: "ID_DOCUMENT", label: "Dokument Identiteti" },
                        { value: "COLLATERAL", label: "Kolateral" },
                        { value: "COURT_ORDER", label: "Urdhër Gjykate" },
                        { value: "PAYMENT_PROOF", label: "Vërtetim Pagese" },
                        { value: "AGREEMENT", label: "Marrëveshje" },
                        { value: "CORRESPONDENCE", label: "Korrespondencë" },
                        { value: "OTHER", label: "Tjetër" },
                      ]} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Shënime <span className="text-gray-300 font-normal normal-case text-[10px]">(opsionale)</span></label>
                      <input value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} placeholder="Përshkrim i shkurtër…"
                        className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors" />
                    </div>
                  </div>
                  <div className="px-6 pb-5 flex gap-3 justify-end">
                    <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Anulo</button>
                    <button onClick={submitUpload} disabled={uploading || !uploadFile}
                      className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                      {uploading ? "Duke ngarkuar…" : "Ngarko"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-gray-900">Dokumenta {docs.length > 0 && <span className="text-gray-400 font-normal">· {docs.length}</span>}</h3>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                <Upload size={13} /> Ngarko
              </button>
            </div>

            {docsLoading ? (
              <div className="divide-y divide-gray-50">
                {[1,2,3].map((i) => <div key={i} className="flex gap-4 px-5 py-3.5 animate-pulse"><div className="flex-1 h-3 bg-gray-100 rounded" /></div>)}
              </div>
            ) : docs.length === 0 ? (
              <EmptyState icon={FileText} title="Nuk ka dokumente të ngarkuara"
                description="Ngarkoni kontrata, kopje identiteti, vërtetime pagese dhe korrespondencë."
                action={{ label: "Ngarko Dokument", onClick: () => setShowUpload(true) }} />
            ) : (
              <Table>
                <Thead><tr><Th>Emri i Skedarit</Th><Th>Lloji</Th><Th>Shënime</Th><Th>Ngarkuar nga</Th><Th>Data</Th><Th></Th></tr></Thead>
                <Tbody>
                  {docs.map((d: any) => (
                    <Tr key={d.id}>
                      <Td>
                        <button onClick={() => downloadDoc(d.id, d.fileName)}
                          className="text-[12px] text-brand-600 hover:underline flex items-center gap-1.5">
                          <Download size={11} className="shrink-0" />{d.fileName}
                        </button>
                        {d.fileSize && <div className="text-[10px] text-gray-400">{(d.fileSize / 1024).toFixed(0)} KB</div>}
                      </Td>
                      <Td><span className="text-[12px] text-gray-500">{d.documentType?.replace(/_/g, " ")}</span></Td>
                      <Td><span className="text-[12px] text-gray-400 line-clamp-1">{d.notes ?? "—"}</span></Td>
                      <Td><span className="text-[12px] text-gray-500">{d.uploadedBy?.fullName ?? "—"}</span></Td>
                      <Td><span className="text-[12px] tabular text-gray-500">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></Td>
                      <Td>
                        {can("document:delete") && (
                          <button onClick={() => deleteDoc(d.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Fshi">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
