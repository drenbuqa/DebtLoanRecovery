"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormErrors, validate } from "@/lib/form";
import Topbar from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency, formatEnum } from "@/lib/utils";
import { cases as casesApi, institutions as instApi, offices as officesApi, users as usersApi } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, RefreshCw, Plus, X, Briefcase } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { useRefreshing } from "@/lib/useRefreshing";
import { useIsMobile } from "@/lib/useIsMobile";
import { MobileFilterSheet } from "@/components/ui/MobileFilterSheet";

// ── Shared field components ──────────────────────────────────
function FL({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500 font-bold">*</span> : <span className="text-gray-300 font-normal normal-case tracking-normal text-[10px]">(opsionale)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1"><span>↑</span>{error}</p>}
    </div>
  );
}

function inp(hasError: boolean) {
  return `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${hasError ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`;
}

// ── Create Case Modal ────────────────────────────────────────────
function CreateCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [searching, setSearching] = useState(false);
  const [personResult, setPersonResult] = useState<any>(null);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Form values
  const [personalId, setPersonalId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [loanNumber, setLoanNumber] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [disbursedAmount, setDisbursedAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [daysPastDue, setDaysPastDue] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [productType, setProductType] = useState("");
  const [nplClass, setNplClass] = useState("");

  const [officeId, setOfficeId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [collectionStage, setCollectionStage] = useState("D1");

  const { touch, touchAll, fieldError } = useFormErrors();

  useEffect(() => {
    Promise.all([instApi.list(), officesApi.list(), usersApi.list({ isActive: true })]).then(([i, o, u]) => {
      setInstitutions(i);
      setOffices(o);
      setOfficers((u as any[]).filter((u: any) => u.role === "OFFICER" || u.role === "MANAGER"));
    }).catch(() => {});
  }, []);

  async function searchPerson() {
    touch("personalId");
    if (!personalId.trim()) return;
    setSearching(true);
    try {
      const person = await casesApi.searchPerson(personalId.trim());
      const wrapped = person ? { person, loanCount: person.loans?.length ?? 0 } : { person: null, loanCount: 0 };
      setPersonResult(wrapped);
      if (person) {
        setFirstName(person.firstName);
        setLastName(person.lastName);
        setPhone1(person.phones?.[0]?.phoneNumber ?? "");
        setPhone2(person.phones?.[1]?.phoneNumber ?? "");
        setEmail(person.email ?? "");
        setAddress(person.address ?? "");
        setCity(person.city ?? "");
      }
    } catch { setPersonResult(null); } finally { setSearching(false); }
  }

  // Step validation rules
  const step1Rules = [
    { field: "personalId", value: personalId, rules: { required: true } },
    { field: "firstName",  value: firstName,  rules: { required: true } },
    { field: "lastName",   value: lastName,   rules: { required: true } },
    { field: "email",      value: email,      rules: { email: true } },
  ];
  const step2Rules = [
    { field: "loanNumber",       value: loanNumber,       rules: { required: true } },
    { field: "institutionId",    value: institutionId,    rules: { required: true } },
    { field: "currentBalance",   value: currentBalance,   rules: { required: true, min: 0 } },
    { field: "daysPastDue",      value: daysPastDue,      rules: { required: true, min: 0 } },
    { field: "disbursementDate", value: disbursementDate, rules: { required: true } },
  ];

  function tryNext() {
    const rules = step === 1 ? step1Rules : step2Rules;
    const allFields = rules.map((r) => r.field);
    touchAll(allFields);
    const hasError = rules.some(({ value, rules: r }) => validate(value, r) !== null);
    if (hasError) return;
    setSubmitError("");
    setStep((s) => s + 1);
  }

  async function submit() {
    setLoading(true); setSubmitError("");
    try {
      await casesApi.create({
        personalId, firstName, lastName,
        phone1: phone1 || undefined, phone2: phone2 || undefined,
        email: email || undefined, address: address || undefined, city: city || undefined,
        loanNumber, institutionId,
        originalLoanAmount: originalAmount ? parseFloat(originalAmount) : parseFloat(currentBalance),
        disbursedAmount: disbursedAmount ? parseFloat(disbursedAmount) : parseFloat(currentBalance),
        currentOutstandingBalance: parseFloat(currentBalance),
        daysPastDue: parseInt(daysPastDue),
        disbursementDate,
        maturityDate: maturityDate || undefined,
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
        productType: productType || undefined,
        nplClassification: nplClass || undefined,
        officeId: officeId || undefined,
        assignedOfficerId: officerId || undefined,
        collectionStage,
      });
      toast("Dosja u krijua me sukses", "success");
      onCreated();
      onClose();
    } catch (e: any) { setSubmitError(e.message); } finally { setLoading(false); }
  }

  // Per-field errors (only shown when touched)
  const E = {
    personalId:      fieldError("personalId",      personalId,      { required: true }),
    firstName:       fieldError("firstName",        firstName,       { required: true }),
    lastName:        fieldError("lastName",         lastName,        { required: true }),
    email:           fieldError("email",            email,           { email: true }),
    loanNumber:      fieldError("loanNumber",       loanNumber,      { required: true }),
    institutionId:   fieldError("institutionId",    institutionId,   { required: true }),
    currentBalance:  fieldError("currentBalance",   currentBalance,  { required: true, min: 0 }),
    daysPastDue:     fieldError("daysPastDue",      daysPastDue,     { required: true, min: 0 }),
    disbursementDate:fieldError("disbursementDate", disbursementDate,{ required: true }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col modal-panel">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Krijo Dosje të Re</h2>
            <div className="flex items-center gap-2 mt-1">
              {["Debitori", "Detajet e Kredisë", "Caktimi"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className="w-6 h-px bg-gray-200" />}
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium ${step === i + 1 ? "text-brand-700" : step > i + 1 ? "text-brand-600" : "text-gray-400"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${step === i + 1 ? "bg-brand-600 text-white" : step > i + 1 ? "bg-brand-200 text-brand-700" : "bg-gray-100 text-gray-400"}`}>
                      {step > i + 1 ? "✓" : i + 1}
                    </div>
                    {s}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{submitError}</div>}

          {/* ── Step 1: Person ── */}
          {step === 1 && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <FL label="Numër Personal" required error={E.personalId}>
                    <input value={personalId} onChange={(e) => setPersonalId(e.target.value)}
                      onBlur={() => touch("personalId")}
                      onKeyDown={(e) => e.key === "Enter" && searchPerson()}
                      placeholder="p.sh. 1234567890"
                      className={inp(!!E.personalId)} />
                  </FL>
                </div>
                <div className="flex items-start pt-6">
                  <button onClick={searchPerson} disabled={searching}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-200 disabled:opacity-50">
                    {searching ? "Duke kërkuar…" : "Kërko"}
                  </button>
                </div>
              </div>
              {personResult && (
                <div className={`p-3 rounded-lg text-[12px] border ${personResult.person ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                  {personResult.person
                    ? `U gjet: ${personResult.person.firstName} ${personResult.person.lastName} · ${personResult.loanCount} kredi ekzistuese. Fushat u plotësuan automatikisht — mund të përditësoni të dhënat e kontaktit.`
                    : "Nuk u gjet asnjë rekord. Plotësoni të dhënat më poshtë për të krijuar një person të ri."}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FL label="Emri" required error={E.firstName}>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch("firstName")}
                    className={inp(!!E.firstName)} placeholder="p.sh. Arton" />
                </FL>
                <FL label="Mbiemri" required error={E.lastName}>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch("lastName")}
                    className={inp(!!E.lastName)} placeholder="p.sh. Berisha" />
                </FL>
                <FL label="Telefon 1" error={null}>
                  <input value={phone1} onChange={(e) => setPhone1(e.target.value)} className={inp(false)} placeholder="+383 44 000 000" />
                </FL>
                <FL label="Telefon 2" error={null}>
                  <input value={phone2} onChange={(e) => setPhone2(e.target.value)} className={inp(false)} placeholder="Numër alternativ" />
                </FL>
                <FL label="Email" error={E.email}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch("email")}
                    className={inp(!!E.email)} placeholder="shembull@email.com" />
                </FL>
                <FL label="Qyteti" error={null}>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={inp(false)} placeholder="p.sh. Prishtinë" />
                </FL>
              </div>
              <FL label="Adresa" error={null}>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inp(false)} placeholder="Rruga, ndërtesa…" />
              </FL>
            </>
          )}

          {/* ── Step 2: Loan Details ── */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Numër Kredie" required error={E.loanNumber}>
                  <input value={loanNumber} onChange={(e) => setLoanNumber(e.target.value)} onBlur={() => touch("loanNumber")}
                    className={inp(!!E.loanNumber)} placeholder="p.sh. PCB-00412" />
                </FL>
                <FL label="Institucion Financiar" required error={E.institutionId}>
                  <div onBlur={() => touch("institutionId")}>
                    <Select value={institutionId} onChange={(v) => { setInstitutionId(v); touch("institutionId"); }}
                      placeholder="Zgjidhni institucionin…"
                      options={institutions.map((i: any) => ({ value: i.id, label: i.name }))} />
                  </div>
                </FL>
                <FL label="Gjendja Debitore Aktuale (EUR)" required error={E.currentBalance}>
                  <input type="number" min="0" step="0.01" value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)} onBlur={() => touch("currentBalance")}
                    className={inp(!!E.currentBalance)} placeholder="0.00" />
                </FL>
                <FL label="Ditë Vonesë" required error={E.daysPastDue}>
                  <input type="number" min="0" value={daysPastDue}
                    onChange={(e) => setDaysPastDue(e.target.value)} onBlur={() => touch("daysPastDue")}
                    className={inp(!!E.daysPastDue)} placeholder="p.sh. 90" />
                </FL>
                <FL label="Data e Disbursimit" required error={E.disbursementDate}>
                  <div onBlur={() => touch("disbursementDate")}>
                    <DatePicker value={disbursementDate} onChange={(v) => { setDisbursementDate(v); touch("disbursementDate"); }} placeholder="Zgjidhni datën" />
                  </div>
                  {E.disbursementDate && <p className="mt-1 text-[11px] text-red-500">↑ {E.disbursementDate}</p>}
                </FL>
                <FL label="Data e Maturimit" error={null}>
                  <DatePicker value={maturityDate} onChange={setMaturityDate} placeholder="Zgjidhni datën" />
                </FL>
                <FL label="Shuma Origjinale e Kredisë (EUR)" error={null}>
                  <input type="number" min="0" step="0.01" value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)} className={inp(false)} placeholder="0.00" />
                </FL>
                <FL label="Shuma e Disbursuar (EUR)" error={null}>
                  <input type="number" min="0" step="0.01" value={disbursedAmount}
                    onChange={(e) => setDisbursedAmount(e.target.value)} className={inp(false)} placeholder="0.00" />
                </FL>
                <FL label="Norma e Interesit (%)" error={null}>
                  <input type="number" min="0" step="0.01" value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)} className={inp(false)} placeholder="p.sh. 12.5" />
                </FL>
                <FL label="Klasifikimi NPL" error={null}>
                  <Select value={nplClass} onChange={setNplClass} placeholder="Asnjë" dropUp
                    options={[
                      { value: "PERFORMING",  label: "Në Performancë" },
                      { value: "WATCH",       label: "Nën Vëzhgim" },
                      { value: "SUBSTANDARD", label: "Nënstandard" },
                      { value: "DOUBTFUL",    label: "Dyshimtë" },
                      { value: "LOSS",        label: "Humbje" },
                    ]} />
                </FL>
              </div>
              <FL label="Lloji i Produktit" error={null}>
                <input value={productType} onChange={(e) => setProductType(e.target.value)}
                  className={inp(false)} placeholder="p.sh. Kredi Konsumatore, Hipotekë, NVM…" />
              </FL>
            </>
          )}

          {/* ── Step 3: Assignment ── */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <FL label="Zyra" error={null}>
                <Select value={officeId} onChange={(v) => { setOfficeId(v); setOfficerId(""); }}
                  placeholder="Pa zyrë specifike"
                  options={offices.map((o: any) => ({ value: o.id, label: o.name }))} />
              </FL>
              <FL label="Oficer i Caktuar" error={null}>
                <Select value={officerId} onChange={setOfficerId} placeholder="Pa caktim"
                  options={officers.map((o: any) => ({ value: o.id, label: o.fullName }))} />
              </FL>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  Faza Fillestare e Arkëtimit <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {["D1","D2","D3","D4","LEGAL","WRITTEN_OFF"].map((s) => (
                    <button key={s} onClick={() => setCollectionStage(s)}
                      className={`py-2 rounded-lg text-[12px] font-semibold border-2 transition-colors ${collectionStage === s ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {formatEnum(s)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 bg-gray-50 rounded-xl p-4 space-y-2 text-[12.5px]">
                <div className="font-semibold text-gray-700 mb-2">Përmbledhja e Dosjes</div>
                <div className="flex justify-between"><span className="text-gray-400">Debitori</span><span className="font-medium">{firstName} {lastName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Numër Personal</span><span className="font-mono">{personalId}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Kredia</span><span className="font-mono">{loanNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Gjendja Debitore</span><span className="font-bold text-gray-900">EUR {parseFloat(currentBalance || "0").toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Ditë Vonesë</span><span className="text-amber-700 font-semibold">{daysPastDue} ditë</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Faza</span><span className="font-semibold text-brand-700">{formatEnum(collectionStage)}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">
            {step > 1 ? "← Kthehu" : "Anulo"}
          </button>
          {step < 3 ? (
            <button onClick={tryNext}
              className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 transition-colors">
              Vazhdo →
            </button>
          ) : (
            <button onClick={submit} disabled={loading}
              className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {loading ? "Duke krijuar…" : "Krijo Dosje"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const STAGE_BADGE: Record<string, any> = {
  D1: "active", D2: "warning", D3: "warning", D4: "danger",
  LEGAL: "legal", WRITTEN_OFF: "closed",
};

const VIEWS = [
  { key: "", label: "Të gjitha Dosjet" },
  { key: "promises_today", label: "Premtime për Sot" },
  { key: "inactive_30d", label: "Joaktive 30+ ditë" },
  { key: "legal", label: "Dosje Juridike" },
];

// ── Mobile case card ─────────────────────────────────────────
function CaseCard({ c, onClick }: { c: any; onClick: () => void }) {
  const dpd = c.loan?.daysPastDue ?? 0;
  const dpdColor = dpd > 180 ? "text-red-600" : dpd > 90 ? "text-amber-600" : "text-gray-700";
  const debtor = c.loan?.borrower ? `${c.loan.borrower.firstName} ${c.loan.borrower.lastName}` : "—";
  const nextAction = c.nextActionDate
    ? new Date(c.nextActionDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" })
    : null;
  const isOverdue = c.nextActionDate && new Date(c.nextActionDate) < new Date();

  return (
    <div onClick={onClick} className="bg-white rounded-2xl border border-gray-200 p-4 active:bg-gray-50 transition-colors cursor-pointer"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-gray-900 truncate">{debtor}</div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
            {c.caseReference} · {c.loan?.institution?.shortName ?? "—"}
          </div>
        </div>
        <Badge variant={STAGE_BADGE[c.collectionStage] ?? "default"} className="shrink-0 text-[11px]">
          {formatEnum(c.collectionStage)}
        </Badge>
      </div>
      <div className="h-px bg-gray-100 mb-3" />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Borxhi</div>
          <div className="text-[13px] font-bold text-gray-900 tabular">
            {formatCurrency(Number(c.loan?.currentOutstandingBalance ?? 0))}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Vonesë</div>
          <div className={`text-[13px] font-bold tabular ${dpdColor}`}>{dpd} ditë</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Veprim</div>
          <div className={`text-[13px] font-bold ${isOverdue ? "text-red-600" : nextAction ? "text-gray-700" : "text-gray-300"}`}>
            {isOverdue ? "Vonuar" : nextAction ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function CasesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, can, scopedToSelf, scopedToOffice } = useAuth();
  const [refreshing, triggerRefresh] = useRefreshing();
  const isMobile = useIsMobile();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [view, setView] = useState(searchParams.get("view") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [stage, setStage] = useState(searchParams.get("stage") ?? "");
  const [stageStatus, setStageStatus] = useState(searchParams.get("stage") ? `stage:${searchParams.get("stage")}` : searchParams.get("status") ? `status:${searchParams.get("status")}` : "");

  function applyStageStatus(v: string) {
    setStageStatus(v);
    if (!v) { setStatus(""); setStage(""); }
    else if (v.startsWith("stage:")) { setStage(v.slice(6)); setStatus(""); }
    else { setStatus(v.slice(7)); setStage(""); }
    setPage(1);
  }
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await casesApi.list({
        page, limit: 25, search: search || undefined,
        view: view || undefined, status: status || undefined, stage: stage || undefined,
        ...(scopedToSelf   && user?.id       ? { officerId: user.id }       : {}),
        ...(scopedToOffice && user?.officeId ? { officeId: user.officeId } : {}),
      });
      setData(res.data);
      setMeta(res.meta);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, view, status, stage]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col">
      {showCreate && <CreateCaseModal onClose={() => setShowCreate(false)} onCreated={load} />}
      <Topbar title="Dosjet" subtitle={scopedToSelf ? `${meta.total.toLocaleString()} caktuara tek ju` : `${meta.total.toLocaleString()} gjithsej dosje`} help={[
        { title: "Si të gjeni një dosje", body: "Shkruani emrin e debitorit, numrin personal ose referencën e dosjes në shiritin e kërkimit. Mund të përdorni edhe filtrat më poshtë për të shfaqur vetëm lloje të caktuara — p.sh. vetëm dosjet me premtime të vonuara ose vetëm dosjet juridike." },
        { title: "Çfarë do të thotë D1, D2, D3, D4?", body: "Këto tregojnë sa gjatë ka qenë borxhi i vonuar. D1 nënkupton 30–60 ditë vonesë (fazë fillestare), D2 është 60–90 ditë, D3 është 90–180 ditë (serioz) dhe D4 është mbi 180 ditë (risk më i lartë). Sa më i madh numri, aq më e vështirë është rikuperimi i borxhit." },
        { title: "Si të hapni një dosje", body: "Klikoni çdo rresht për të hapur dosjen e plotë — do të shihni të dhënat e debitorit, informacionin e kredisë, të gjitha thirrjet dhe vizitat e regjistruara, pagesat e marra dhe çdo procedurë juridike." },
        { title: "Statusi i dosjes i shpjeguar", body: "Aktive nënkupton se dosja është në punë. Juridike nënkupton se është eskaluar në procedura gjyqësore. Mbyllur nënkupton se është zgjidhur, shlyer ose paguar plotësisht." },
      ]} />

      {/* ── Mobile layout ── */}
      {isMobile ? (
        <div className="p-3 space-y-2.5">
          {/* Row 1: search + new case button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-9 pr-3 py-2.5 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-400"
                placeholder="Kërko debitor, dosje…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            {can("case:create") && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 px-3.5 py-2.5 bg-brand-600 text-white rounded-xl text-[13px] font-medium shrink-0">
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Row 2: filter chips (scrollable) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <MobileFilterSheet
              groups={[
                {
                  key: "stageStatus",
                  label: "Faza",
                  value: stageStatus,
                  onChange: applyStageStatus,
                  options: [
                    { value: "stage:D1", label: "D1" },
                    { value: "stage:D2", label: "D2" },
                    { value: "stage:D3", label: "D3" },
                    { value: "stage:D4", label: "D4" },
                    { value: "stage:LEGAL", label: "Juridike" },
                    { value: "stage:WRITTEN_OFF", label: "I Shlyer" },
                    { value: "status:SUSPENDED", label: "Pezulluar" },
                    { value: "status:CLOSED", label: "Mbyllur" },
                  ],
                },
                {
                  key: "view",
                  label: "Shikimi",
                  value: view,
                  onChange: (v) => { setView(v); setPage(1); },
                  allLabel: "Të gjitha",
                  options: VIEWS.filter((v) => v.key !== "").map((v) => ({ value: v.key, label: v.label })),
                },
              ]}
            />
          </div>

          {/* Count + refresh */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] text-gray-400">{meta.total.toLocaleString()} dosje</span>
            <button onClick={() => triggerRefresh(load)} className="p-1.5 text-gray-400">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Cards or states */}
          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
              {error} <button onClick={load} className="underline ml-2">Riprovo</button>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse space-y-3">
                  <div className="flex justify-between"><div className="h-4 w-32 bg-gray-100 rounded" /><div className="h-5 w-12 bg-gray-100 rounded-full" /></div>
                  <div className="h-px bg-gray-100" />
                  <div className="grid grid-cols-3 gap-2">
                    {[0,1,2].map(j => <div key={j} className="space-y-1"><div className="h-2 w-10 bg-gray-100 rounded" /><div className="h-4 w-16 bg-gray-100 rounded" /></div>)}
                  </div>
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Briefcase size={22} className="text-gray-400" />
              </div>
              <div className="text-center">
                <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën dosje</div>
                <div className="text-[12px] text-gray-400">Provoni të ndryshoni filtrat.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.map((c) => (
                <CaseCard key={c.id} c={c} onClick={() => router.push(`/cases/${c.id}`)} />
              ))}
              {meta.pages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-1 pb-2">
                  <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setPage((p) => Math.max(1, p - 1)); }} disabled={page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 disabled:opacity-30">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[13px] text-gray-500 tabular-nums">{page} / {meta.pages}</span>
                  <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setPage((p) => Math.min(meta.pages, p + 1)); }} disabled={page === meta.pages}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 disabled:opacity-30">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (

      /* ── Desktop layout ── */
      <div className="p-4 md:p-6 space-y-3">

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
              placeholder="Kërko debitor, ref. dosje, kredi…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <Select value={stageStatus} onChange={applyStageStatus} label="Faza" placeholder="Të gjitha"
            className="w-44"
            options={[
              { value: "stage:D1",          label: "D1" },
              { value: "stage:D2",          label: "D2" },
              { value: "stage:D3",          label: "D3" },
              { value: "stage:D4",          label: "D4" },
              { value: "stage:LEGAL",       label: "Juridike" },
              { value: "stage:WRITTEN_OFF", label: "I Shlyer" },
              { value: "status:SUSPENDED",  label: "Pezulluar" },
              { value: "status:CLOSED",     label: "Mbyllur" },
            ]} />

          {can("case:create") && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors ml-auto">
              <Plus size={14} /> Dosje e Re
            </button>
          )}
        </div>

        {/* View tabs */}
        <div className="flex items-center border-b border-gray-200">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => { setView(v.key); setPage(1); }}
              className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                view === v.key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {v.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 pb-px shrink-0">
            <span className="text-[12px] text-gray-400">{!loading && `${meta.total.toLocaleString()} dosje`}</span>
            <button onClick={() => triggerRefresh(load)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {error ? (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">Ka ndodhur një gabim: {error} <button onClick={load} className="underline ml-2">Riprovo</button></div>
          ) : loading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
              <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Briefcase size={22} className="text-gray-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën dosje</div>
                <div className="text-[12px] text-gray-400 max-w-xs">Provoni të ndryshoni filtrat ose krijoni një dosje të re për të filluar.</div>
              </div>
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Dosja / Debitori</Th>
                  <Th>Institucioni</Th>
                  <Th>Gjendja Debitore</Th>
                  <Th>Ditë Vonesë</Th>
                  <Th>Faza / Statusi</Th>
                  <Th>Oficeri</Th>
                  <Th>Veprimi i Ardhshëm</Th>
                </tr>
              </Thead>
              <Tbody>
                {data.map((c) => (
                  <Tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                    <Td>
                      <div className="font-medium text-gray-900">
                        {c.loan?.borrower
                          ? `${c.loan.borrower.firstName} ${c.loan.borrower.lastName}`
                          : "—"}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">{c.caseReference}</div>
                    </Td>
                    <Td>
                      <div className="text-[12px] text-gray-600">{c.loan?.institution?.shortName ?? "—"}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{c.loan?.loanNumber ?? "—"}</div>
                    </Td>
                    <Td>
                      <span className="font-semibold tabular text-gray-900">
                        {formatCurrency(Number(c.loan?.currentOutstandingBalance ?? 0))}
                      </span>
                    </Td>
                    <Td>
                      <span className={`text-[12px] font-semibold tabular ${
                        c.loan?.daysPastDue > 180 ? "text-red-600" :
                        c.loan?.daysPastDue > 90 ? "text-amber-600" : "text-gray-700"
                      }`}>
                        {c.loan?.daysPastDue ?? 0} ditë
                      </span>
                    </Td>
                    <Td>
                      <Badge variant={STAGE_BADGE[c.collectionStage] ?? "default"}>{formatEnum(c.collectionStage)}</Badge>
                      {c.status !== "ACTIVE" && c.collectionStage !== "LEGAL" && c.collectionStage !== "WRITTEN_OFF" && (
                        <div className="text-[11px] text-gray-400 mt-0.5">{formatEnum(c.status)}</div>
                      )}
                    </Td>
                    <Td><span className="text-[12px] text-gray-500">{c.assignedOfficer?.fullName ?? "—"}</span></Td>
                    <Td>
                      <span className="text-[12px] text-gray-400">
                        {c.nextActionDate
                          ? new Date(c.nextActionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                          : "—"}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[12px] text-gray-400">{((meta.page - 1) * 25) + 1}–{Math.min(meta.page * 25, meta.total)} nga {meta.total.toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setPage((p) => Math.max(1, p - 1)); }} disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[12px] text-gray-500 tabular-nums min-w-[60px] text-center">{page} / {meta.pages}</span>
                <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setPage((p) => Math.min(meta.pages, p + 1)); }} disabled={page === meta.pages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense>
      <CasesPageInner />
    </Suspense>
  );
}
