"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormErrors } from "@/lib/form";
import Topbar from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency, formatEnum } from "@/lib/utils";
import { cases as casesApi, institutions as instApi, users as usersApi } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, RefreshCw, Plus, X, Briefcase, ChevronDown } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { DatePresetPicker, DatePreset, presetToRange } from "@/components/ui/DatePresetPicker";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { useRefreshing } from "@/lib/useRefreshing";
import { useIsMobile } from "@/lib/useIsMobile";
import { MobileFilterSheet } from "@/components/ui/MobileFilterSheet";

// ── Shared field components ──────────────────────────────────
function FL({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1 whitespace-nowrap overflow-hidden">
        <span className="truncate">{label}</span>
        {required && <span className="text-red-500 font-bold shrink-0">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1"><span>↑</span>{error}</p>}
    </div>
  );
}

function inp(hasError: boolean) {
  return `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${hasError ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`;
}

const KOSOVO_CITIES = [
  "Deçan","Dragash","Ferizaj","Gjakova","Gjilan","Graçanicë","Hani i Elezit",
  "Istog","Junik","Kaçanik","Klinë","Klokot","Lipjan","Malishevë","Mamusha",
  "Mitrovicë","Novo Brdo","Partesh","Pejë","Podujeva","Prishtinë","Prizren",
  "Rahovec","Ranillug","Skenderaj","Shtime","Shtërpcë","Suharekë","Vushtrri","Tjetër",
];

// ── Create Client Modal ────────────────────────────────────────────
function CreateCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [personResult, setPersonResult] = useState<any>(null);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showExtra, setShowExtra] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const [loanNumber, setLoanNumber] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone1, setPhone1] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [city, setCity] = useState("");
  const [collectionStage, setCollectionStage] = useState("D1");
  const [officerId, setOfficerId] = useState("");
  const [secondaryOfficerId, setSecondaryOfficerId] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [nplClass, setNplClass] = useState("");
  const [registrationDate, setRegistrationDate] = useState(today);

  const { touch, touchAll, fieldError } = useFormErrors();

  const institutionOptions = useMemo(
    () => institutions.map((i: any) => ({ value: i.id, label: i.name })),
    [institutions]
  );
  const officerOptions = useMemo(
    () => officers.map((o: any) => ({ value: o.id, label: o.fullName })),
    [officers]
  );

  useEffect(() => {
    Promise.all([instApi.list(), usersApi.list({ isActive: true })]).then(([i, u]) => {
      setInstitutions(i);
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
        setAddress(person.address ?? "");
        setCity(person.city ?? "");
        setShowExtra(true);
      }
    } catch { setPersonResult(null); } finally { setSearching(false); }
  }

  const E = {
    loanNumber:    fieldError("loanNumber",    loanNumber,    { required: true }),
    personalId:    fieldError("personalId",    personalId,    { required: true }),
    firstName:     fieldError("firstName",     firstName,     { required: true }),
    lastName:      fieldError("lastName",      lastName,      { required: true }),
    originalAmount:fieldError("originalAmount",originalAmount,{ required: true, min: 0 }),
    currentBalance:fieldError("currentBalance",currentBalance,{ required: true, min: 0 }),
    institutionId: fieldError("institutionId", institutionId, { required: true }),
  };

  async function submit() {
    touchAll(["loanNumber","personalId","firstName","lastName","originalAmount","currentBalance","institutionId"]);
    const hasErrors =
      !loanNumber.trim() || !personalId.trim() || !firstName.trim() ||
      !lastName.trim() || !originalAmount || !currentBalance || !institutionId;
    if (hasErrors) return;
    setLoading(true); setSubmitError("");
    try {
      await casesApi.create({
        loanNumber, personalId, firstName, lastName,
        address: address || undefined,
        phone1: phone1 || undefined,
        originalLoanAmount: parseFloat(originalAmount),
        currentOutstandingBalance: parseFloat(currentBalance),
        city: city || undefined,
        collectionStage,
        assignedOfficerId: officerId || undefined,
        secondaryOfficerId: secondaryOfficerId || undefined,
        institutionId,
        nplClassification: nplClass || undefined,
        registrationDate: registrationDate || undefined,
      });
      toast("Klienti u regjistrua me sukses", "success");
      onCreated(); onClose();
    } catch (e: any) { setSubmitError(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col modal-panel">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Klient i Ri</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Plotëso të dhënat kryesore për të regjistruar klientin</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{submitError}</div>}

          {/* Step 1 — ID search */}
          <div>
            <div className="flex gap-2">
              <div className="flex-1">
                <FL label="Numri Letërnjoftimit / Biznesit" required error={E.personalId}>
                  <input value={personalId} onChange={(e) => { setPersonalId(e.target.value); setPersonResult(null); }}
                    onBlur={() => touch("personalId")}
                    onKeyDown={(e) => e.key === "Enter" && searchPerson()}
                    placeholder="p.sh. 1234567890"
                    className={inp(!!E.personalId)} />
                </FL>
              </div>
              <div className="flex items-start pt-6">
                <button onClick={searchPerson} disabled={searching}
                  className="h-[34px] px-4 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap">
                  Kërko
                </button>
              </div>
            </div>

            {/* Fixed-height status area — always rendered to prevent layout shift */}
            <div className="mt-1.5 min-h-[36px]">
              {!personResult && !searching && (
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Shtyp numrin personal ose numrin e biznesit dhe kliko <strong className="font-medium text-gray-500">Kërko</strong> — nëse ekziston, të dhënat plotësohen automatikisht.
                </p>
              )}
              {searching && (
                <p className="text-[11px] text-gray-400">Duke kërkuar…</p>
              )}
              {personResult && (
                <div className={`px-3 py-2 rounded-lg text-[12px] border flex items-center gap-2
                  ${personResult.person ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <span>{personResult.person ? "✓" : "ℹ"}</span>
                  <span>
                    {personResult.person
                      ? `U gjet: ${personResult.person.firstName} ${personResult.person.lastName} · ${personResult.loanCount} kredi ekzistuese.`
                      : "Nuk u gjet asnjë rekord. Plotëso të dhënat manualisht."}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Core required fields */}
          <div className="grid grid-cols-2 gap-3">
            <FL label="Numri i Kredisë" required error={E.loanNumber}>
              <input value={loanNumber} onChange={(e) => setLoanNumber(e.target.value)} onBlur={() => touch("loanNumber")}
                className={inp(!!E.loanNumber)} placeholder="p.sh. PCB-00412" />
            </FL>
            <FL label="Institucioni" required error={E.institutionId}>
              <div onBlur={() => touch("institutionId")}>
                <Select value={institutionId} onChange={(v) => { setInstitutionId(v); touch("institutionId"); }}
                  placeholder="Zgjidhni…" searchable
                  options={institutionOptions} />
              </div>
            </FL>
            <FL label="Emri" required error={E.firstName}>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch("firstName")}
                className={inp(!!E.firstName)} placeholder="Emri" />
            </FL>
            <FL label="Mbiemri" required error={E.lastName}>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch("lastName")}
                className={inp(!!E.lastName)} placeholder="Mbiemri" />
            </FL>
            <FL label="Shuma e Financuar (EUR)" required error={E.originalAmount}>
              <input type="number" min="0" step="0.01" value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)} onBlur={() => touch("originalAmount")}
                className={inp(!!E.originalAmount)} placeholder="0.00" />
            </FL>
            <FL label="Borgji Aktual (EUR)" required error={E.currentBalance}>
              <input type="number" min="0" step="0.01" value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)} onBlur={() => touch("currentBalance")}
                className={inp(!!E.currentBalance)} placeholder="0.00" />
            </FL>
          </div>

          {/* Collapsible optional section */}
          <div className="border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => setShowExtra((v) => !v)}
              className="w-full flex items-center justify-between py-2 text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
              <span>Detaje Shtesë</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${showExtra ? "rotate-180" : ""}`} />
            </button>

            <div style={{
              display: "grid",
              gridTemplateRows: showExtra ? "1fr" : "0fr",
              transition: "grid-template-rows 0.3s ease",
            }}>
              <div style={{ overflow: "hidden" }}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-3 pb-1">
                  <FL label="Adresa në Kontratë" error={null}>
                    <input value={address} onChange={(e) => setAddress(e.target.value)}
                      className={inp(false)} placeholder="Rruga, ndërtesa…" />
                  </FL>
                  <FL label="Numri i Telefonit" error={null}>
                    <input value={phone1} onChange={(e) => setPhone1(e.target.value)}
                      className={inp(false)} placeholder="+383 44 000 000" />
                  </FL>
                  <FL label="Qyteti" error={null}>
                    <Select value={city} onChange={setCity} placeholder="Zgjidhni qytetin…" searchable dropUp
                      options={KOSOVO_CITIES.map((c) => ({ value: c, label: c }))} />
                  </FL>
                  <FL label="Kategoria / Procedura" error={null}>
                    <Select value={collectionStage} onChange={setCollectionStage} dropUp
                      options={[
                        { value: "D1", label: "D1" },
                        { value: "D2", label: "D2" },
                        { value: "D3", label: "D3" },
                        { value: "D4", label: "D4" },
                        { value: "LEGAL", label: "Juridike" },
                        { value: "WRITTEN_OFF", label: "I Shlyer" },
                      ]} />
                  </FL>
                  <FL label="Zyrtari Primar" error={null}>
                    <Select value={officerId} onChange={setOfficerId} placeholder="Pa caktim" searchable dropUp
                      options={officerOptions} />
                  </FL>
                  <FL label="Zyrtari Sekondar" error={null}>
                    <Select value={secondaryOfficerId} onChange={setSecondaryOfficerId} placeholder="Pa caktim" searchable dropUp
                      options={officerOptions} />
                  </FL>
                  <FL label="Kategoria / Performanca" error={null}>
                    <Select value={nplClass} onChange={setNplClass} placeholder="Pa kategori" dropUp
                      options={[
                        { value: "PERFORMING",  label: "Performues" },
                        { value: "WATCH",       label: "Nën Vëzhgim" },
                        { value: "SUBSTANDARD", label: "Nënstandard" },
                        { value: "DOUBTFUL",    label: "I Dyshimtë" },
                        { value: "LOSS",        label: "Humbje" },
                      ]} />
                  </FL>
                  <FL label="Data e Regjistrimit" error={null}>
                    <DatePicker value={registrationDate} onChange={setRegistrationDate} placeholder="Zgjidhni datën" />
                  </FL>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
          <button onClick={submit} disabled={loading}
            className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {loading ? "Duke regjistruar…" : "Regjistro Klientin"}
          </button>
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
    ? new Date(c.nextActionDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "long" })
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
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
        from: dateFrom || undefined, to: dateTo || undefined,
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
  }, [page, search, view, status, stage, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col">
      {showCreate && <CreateCaseModal onClose={() => setShowCreate(false)} onCreated={load} />}
      <Topbar title="Klientët" subtitle={scopedToSelf ? `${meta.total.toLocaleString()} caktuara tek ju` : `${meta.total.toLocaleString()} gjithsej dosje`} help={[
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

          <DatePresetPicker label="Periudha" value={datePreset} onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); setPage(1); }} />

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
              <Plus size={14} /> Klient i Ri
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
                          ? new Date(c.nextActionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
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
