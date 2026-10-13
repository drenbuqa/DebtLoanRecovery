"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";
import { cases as casesApi, payments as paymentsApi, performance as perfApi, activities as activitiesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatEnum } from "@/lib/utils";
import { downloadExcel } from "@/lib/exportExcel";
import {
  ArrowUpRight, FolderOpen, ChevronRight,
  BarChart3, CheckSquare, AlertCircle, FileCheck,
  Phone, Calendar, Banknote, AlertTriangle,
  TrendingUp, Scale, FileSpreadsheet, Download, Users, Clock,
} from "lucide-react";

const MONTHS = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];

function fmtShort(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `€${(v / 1_000).toFixed(0)}k`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(1)}k`;
  return `€${v}`;
}

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 0) return "tani";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "tani";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const FAZA_LABEL: Record<string, string> = {
  KLIENT_I_RI:           "Klienti i Ri",
  PAKONTAKTUAR:          "I Pakontaktuar",
  ZOTIM_PAGESE:          "Zotim Pagese",
  ME_MARREVESHJE:        "Me Marrëveshje",
  KONTESTIM_BORGJI:      "Kontestim Borgji",
  NUK_PRANON_MARREVESHJE:"Nuk Pranon",
  JURIDIKE:              "Juridike",
  TJERA:                 "Të Tjera",
};

const ACT_LABEL: Record<string, string> = {
  CALL: "Telefonatë", CALL_BORROWER: "Telefonatë", CALL_GUARANTOR: "Telefonatë",
  VISIT: "Vizitë", FIELD_VISIT: "Vizitë", VISIT_BORROWER: "Vizitë",
  MEETING_BORROWER: "Takim", MEETING_GUARANTOR: "Takim",
  PROMISE_TO_PAY: "Premtim", PAYMENT_RECEIVED: "Pagesë",
  LEGAL_ACTION: "Juridike", SMS: "SMS", WARNING_LETTER: "Letër",
};

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, urgent, href, loading,
}: {
  label: string; value: string | number; icon: React.ElementType;
  urgent?: boolean; href?: string; loading?: boolean;
}) {
  const inner = loading ? (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2 bg-gray-100 animate-pulse rounded w-20" />
        <div className="h-5 bg-gray-100 animate-pulse rounded w-14" />
      </div>
    </div>
  ) : (
    <div className={`bg-white rounded-xl border px-4 py-3.5 flex items-center gap-3 transition-colors min-h-[76px] ${
      href ? "hover:border-gray-300 cursor-pointer" : ""
    } ${urgent ? "border-red-200" : "border-gray-200"}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${urgent ? "bg-red-50" : "bg-gray-100"}`}>
        <Icon size={15} className={urgent ? "text-red-500" : "text-gray-500"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-medium text-gray-400 uppercase tracking-wide leading-tight mb-1.5">{label}</div>
        <div className={`text-[19px] font-bold tabular leading-none ${urgent ? "text-red-600" : "text-gray-900"}`}>{value}</div>
      </div>
    </div>
  );
  if (href && !loading) return <a href={href}>{inner}</a>;
  return inner;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, sub, action, onAction, children }: {
  title: string; sub?: string;
  action?: string; onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
          {sub && <p className="text-[11.5px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {action && onAction && (
          <button onClick={onAction} className="text-[12px] text-brand-600 font-medium hover:underline flex items-center gap-1">
            {action} <ArrowUpRight size={12} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-8 text-center text-[12.5px] text-gray-400">{message}</div>
  );
}

function RowSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-gray-100 animate-pulse rounded" style={{ width: `${50 + (i % 3) * 18}%` }} />
            <div className="h-2 bg-gray-100 animate-pulse rounded w-24" />
          </div>
          <div className="w-10 h-2.5 bg-gray-100 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Reports section ───────────────────────────────────────────────────────────

const FAZA_LABEL_FULL: Record<string, string> = {
  KLIENT_I_RI: "Klienti i Ri", PAKONTAKTUAR: "I Pakontaktuar",
  ZOTIM_PAGESE: "Zotim Pagese", ME_MARREVESHJE: "Me Marrëveshje",
  KONTESTIM_BORGJI: "Kontestim Borgji", NUK_PRANON_MARREVESHJE: "Nuk Pranon Marrëveshje",
  JURIDIKE: "Juridike", TJERA: "Të Tjera",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktive", LEGAL: "Juridike", SUSPENDED: "Pezulluar",
  CLOSED: "Mbyllur", ANKES: "Ankesë", AKTGJYKIM: "Aktgjykim",
};

type ReportDef = {
  id: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  run: () => Promise<void>;
};

function ReportsSection({ reports }: { reports: ReportDef[] }) {
  const [loading, setLoading] = React.useState<string | null>(null);

  async function run(r: ReportDef) {
    if (loading) return;
    setLoading(r.id);
    try { await r.run(); } finally { setLoading(null); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900">Raporte</h3>
          <p className="text-[11.5px] text-gray-400 mt-0.5">Shkarkoni të dhëna si Excel</p>
        </div>
        <FileSpreadsheet size={16} className="text-gray-300" />
      </div>
      <div className="divide-y divide-gray-50">
        {reports.map((r) => {
          const isRunning = loading === r.id;
          return (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <r.icon size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-gray-900">{r.title}</div>
                <div className="text-[11.5px] text-gray-400 mt-0.5">{r.desc}</div>
              </div>
              <button
                onClick={() => run(r)}
                disabled={!!loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 shrink-0">
                {isRunning
                  ? <><span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Duke gjeneruar…</>
                  : <><Download size={12} />Shkarko</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Case row (reused in multiple sections) ────────────────────────────────────

function CaseRow({ c, note, onClick }: { c: any; note?: string; onClick: () => void }) {
  const name  = c.loan?.borrower?.fullName ?? "—";
  const faza  = c.collectionStatus ?? "";
  const fazaText = FAZA_LABEL[faza] ?? faza;
  const isLegal  = faza === "JURIDIKE";
  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <span className="text-gray-500 text-[9px] font-bold">
          {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-gray-900 truncate">{name}</div>
        <div className="text-[11px] text-gray-400">{c.caseReference}{note ? ` · ${note}` : ""}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {fazaText && (
          <span className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded ${isLegal ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"}`}>
            {fazaText}
          </span>
        )}
        <ChevronRight size={13} className="text-gray-300" />
      </div>
    </div>
  );
}

// ── OFFICER dashboard ─────────────────────────────────────────────────────────

function OfficerDashboard({ user }: { user: any }) {
  const router = useRouter();
  const now    = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const yr = now.getFullYear(); const mo = now.getMonth();
  const monthFrom = new Date(yr, mo, 1).toISOString().slice(0, 10);
  const monthTo   = new Date(yr, mo + 1, 0).toISOString().slice(0, 10);

  const { data: myCasesRes, isLoading: casesLoading } = useSWR(
    user?.id ? ["officer-cases", user.id] : null,
    () => casesApi.list({ officerId: user.id, limit: 20, page: 1 }),
  );

  const { data: myPerf, isLoading: perfLoading } = useSWR(
    user?.id ? ["officer-perf", user.id, monthFrom] : null,
    async () => {
      const res = await perfApi.officers({ from: monthFrom, to: monthTo, officerId: user.id });
      return res?.[0] ?? null;
    },
  );

  const { data: overdueRes, isLoading: overdueLoading } = useSWR(
    user?.id ? ["officer-overdue", user.id] : null,
    () => casesApi.list({ officerId: user.id, view: "vonesa", limit: 5, page: 1 }),
  );

  const { data: brokenRes, isLoading: brokenLoading } = useSWR(
    user?.id ? ["officer-broken", user.id] : null,
    () => casesApi.list({ officerId: user.id, view: "premtime_thyera", limit: 5, page: 1 }),
  );

  const allCases    = myCasesRes?.data ?? [];
  const todayCases  = allCases.filter((c: any) => c.nextActionDate?.slice(0, 10) === todayISO);
  const activeCases = myCasesRes?.meta?.total ?? allCases.length;
  const overdueCases  = overdueRes?.data ?? [];
  const brokenCases   = brokenRes?.data  ?? [];

  const collectedThisMonth = myPerf?.primary?.collectedAmount ?? 0;
  const callsThisMonth     = myPerf?.primary?.calls ?? 0;
  const loading = casesLoading || perfLoading;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Mirëmëngjes" : hour < 17 ? "Mirëdita" : "Mirëmbrëma";
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col">
      <Topbar
        title="Ballina Ime"
        subtitle={`${greeting}, ${firstName} · ${MONTHS[mo]} ${now.getDate()}, ${yr}`}
      />
      <div className="p-4 md:p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <KpiCard label="Klient Aktive"        value={loading ? "—" : activeCases.toLocaleString()}           icon={FolderOpen}  href="/cases"    loading={loading} />
          <KpiCard label="Telefonata Këtë Muaj" value={loading ? "—" : callsThisMonth.toLocaleString()}        icon={Phone}                        loading={loading} />
          <KpiCard label="Arkëtuar Këtë Muaj"   value={loading ? "—" : fmtShort(collectedThisMonth)}           icon={Banknote}                      loading={loading} />
          <KpiCard label="Ndjekje Sot"          value={loading ? "—" : todayCases.length.toLocaleString()}     icon={Calendar}    href="/cases"    loading={loading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

          {/* Today's follow-ups */}
          <Section title="Ndjekje Sot" sub="Klientët me datë veprimi sot" action="Shiko të gjitha" onAction={() => router.push("/cases")}>
            {casesLoading ? <RowSkeleton n={3} /> : todayCases.length === 0 ? (
              <EmptyRow message="Nuk ka ndjekje të planifikuara për sot" />
            ) : todayCases.slice(0, 5).map((c: any) => (
              <CaseRow key={c.id} c={c} onClick={() => router.push(`/cases/${c.id}`)} />
            ))}
          </Section>

          {/* Overdue promises */}
          <Section title="Premtime me Vonesë" sub="Klientë me premtim të kaluar pa pagesë" action="Shiko të gjitha" onAction={() => router.push("/cases?view=vonesa")}>
            {overdueLoading ? <RowSkeleton n={3} /> : overdueCases.length === 0 ? (
              <EmptyRow message="Nuk ka premtime me vonesë" />
            ) : overdueCases.map((c: any) => {
              const p = c.latestPromise;
              const due = p?.promiseDate ? new Date(p.promiseDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" }) : null;
              return (
                <CaseRow key={c.id} c={c}
                  note={due ? `Premtim ${due}` : undefined}
                  onClick={() => router.push(`/cases/${c.id}`)} />
              );
            })}
          </Section>

          {/* Broken promises (no action taken) */}
          <Section title="Premtime të Thyera" sub="Premtime pa asnjë kontakt pas datës" action="Shiko të gjitha" onAction={() => router.push("/cases?view=premtime_thyera")}>
            {brokenLoading ? <RowSkeleton n={3} /> : brokenCases.length === 0 ? (
              <EmptyRow message="Nuk ka premtime të thyera" />
            ) : brokenCases.map((c: any) => {
              const p = c.latestPromise;
              const due = p?.promiseDate ? new Date(p.promiseDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" }) : null;
              return (
                <CaseRow key={c.id} c={c}
                  note={due ? `Premtim ${due}` : undefined}
                  onClick={() => router.push(`/cases/${c.id}`)} />
              );
            })}
          </Section>

          {/* My cases with promises due soon */}
          <Section title="Premtime Afër Skadencës" sub="Premtime aktive që skadojnë brenda 7 ditëve" action="Shiko të gjitha" onAction={() => router.push("/cases?view=all_promises")}>
            {casesLoading ? <RowSkeleton n={3} /> :
              allCases.filter((c: any) => {
                const p = c.latestPromise;
                if (!p?.promiseDate) return false;
                const d = new Date(p.promiseDate);
                const diff = (d.getTime() - now.getTime()) / 86400000;
                return diff >= 0 && diff <= 7;
              }).slice(0, 5).length === 0 ? (
              <EmptyRow message="Nuk ka premtime afër skadencës" />
            ) : allCases.filter((c: any) => {
                const p = c.latestPromise;
                if (!p?.promiseDate) return false;
                const d = new Date(p.promiseDate);
                const diff = (d.getTime() - now.getTime()) / 86400000;
                return diff >= 0 && diff <= 7;
              }).slice(0, 5).map((c: any) => {
              const p = c.latestPromise;
              const due = new Date(p.promiseDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" });
              return (
                <CaseRow key={c.id} c={c}
                  note={`${due} · ${p.promisedAmount ? fmtShort(p.promisedAmount) : ""}`}
                  onClick={() => router.push(`/cases/${c.id}`)} />
              );
            })}
          </Section>

        </div>

        {/* Reports */}
        <ReportsSection reports={[
          {
            id: "my-clients",
            icon: FolderOpen,
            title: "Klientët e Mi",
            desc: "Të gjithë klientët aktive të caktuar tek ju — me borxhin, fazën dhe oficerin",
            run: async () => {
              const all: any[] = [];
              let p = 1;
              while (true) {
                const r = await casesApi.list({ officerId: user.id, page: p, limit: 500 });
                all.push(...r.data);
                if (p >= r.meta.pages) break; p++;
              }
              const today = new Date().toISOString().slice(0, 10);
              downloadExcel(all.map((c: any) => ({
                "Ref. Klientit":      c.caseReference ?? "",
                "Emri i Plotë":       c.loan?.borrower?.fullName ?? "",
                "Nr. Personal":       (c.loan?.borrower?.personalId?.startsWith("NOID-") ? "" : c.loan?.borrower?.personalId) ?? "",
                "Telefon":            c.loan?.borrower?.phones?.[0]?.phoneNumber ?? "",
                "Banka":              c.loan?.institution?.name ?? "",
                "Nr. Kredie":         c.loan?.loanNumber ?? "",
                "Borxhi Aktual (€)":  Number(c.loan?.currentOutstandingBalance ?? 0),
                "Faza":               FAZA_LABEL_FULL[c.collectionStatus] ?? c.collectionStatus ?? "",
                "Statusi":            STATUS_LABEL[c.status] ?? c.status ?? "",
                "Data Premtimit":     c.latestPromise?.promiseDate ? new Date(c.latestPromise.promiseDate).toLocaleDateString("sq-AL") : "",
                "Shuma Premtimit (€)":c.latestPromise?.promisedAmount ? Number(c.latestPromise.promisedAmount) : "",
                "Data Veprimit":      c.nextActionDate ? new Date(c.nextActionDate).toLocaleDateString("sq-AL") : "",
              })), `klientet-e-mi-${today}`);
            },
          },
          {
            id: "my-activities",
            icon: Clock,
            title: "Aktivitetet e Muajit",
            desc: `Të gjitha aktivitetet tuaja në ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`,
            run: async () => {
              const now2 = new Date();
              const mo2 = now2.getMonth(); const yr2 = now2.getFullYear();
              const from = `${yr2}-${String(mo2 + 1).padStart(2, "0")}-01`;
              const to   = new Date(yr2, mo2 + 1, 0).toISOString().slice(0, 10);
              const all: any[] = [];
              let p = 1;
              while (true) {
                const r = await activitiesApi.listAll({ officerId: user.id, from, to, page: p, limit: 500 });
                all.push(...r.data);
                if (p >= r.meta.pages) break; p++;
              }
              const actLabel: Record<string, string> = {
                CALL: "Telefonatë", CALL_BORROWER: "Telefonatë", CALL_GUARANTOR: "Telefonatë",
                VISIT: "Vizitë", FIELD_VISIT: "Vizitë", VISIT_BORROWER: "Vizitë",
                MEETING_BORROWER: "Takim", PROMISE_TO_PAY: "Premtim", PAYMENT_RECEIVED: "Pagesë",
                SMS: "SMS", WARNING_LETTER: "Letër", LEGAL_ACTION: "Juridike",
              };
              const today = new Date().toISOString().slice(0, 10);
              downloadExcel(all.map((a: any) => ({
                "Data":          a.occurredAt ? new Date(a.occurredAt).toLocaleDateString("sq-AL") : "",
                "Ora":           a.occurredAt ? new Date(a.occurredAt).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" }) : "",
                "Lloji":         actLabel[a.activityType] ?? formatEnum(a.activityType ?? ""),
                "Debitori":      a.case?.loan?.borrower?.fullName ?? "",
                "Ref. Klientit": a.case?.caseReference ?? "",
                "Shënime":       a.notes ?? "",
                "Oficeri":       a.officer?.fullName ?? "",
              })), `aktivitetet-${MONTHS[mo2].toLowerCase()}-${yr2}-${today}`);
            },
          },
        ]} />

      </div>
    </div>
  );
}

// ── MANAGER / ADMIN dashboard ─────────────────────────────────────────────────

function ManagerDashboard({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const router = useRouter();
  const now    = new Date();
  const yr = now.getFullYear(); const mo = now.getMonth();
  const monthFrom = new Date(yr, mo, 1).toISOString().slice(0, 10);
  const officeId  = isAdmin ? undefined : user?.officeId;

  const { data: dashData, error, isLoading: loading, mutate } = useSWR(
    user ? ["dashboard", officeId, monthFrom] : null,
    async () => {
      const [s, p] = await Promise.all([
        casesApi.dashboardStats(officeId),
        paymentsApi.list({ limit: 5, ...(officeId ? { officeId } : {}) }),
      ]);
      return { stats: s, recentPayments: p.data };
    },
    { revalidateOnFocus: true },
  );

  const { data: recentActs, isLoading: actsLoading } = useSWR(
    user ? ["dash-activities", officeId] : null,
    () => activitiesApi.listAll({ limit: 8, ...(officeId ? { officeId } : {}) }),
  );

  const { data: overdueRes, isLoading: overdueLoading } = useSWR(
    user ? ["dash-overdue", officeId] : null,
    () => casesApi.list({ view: "vonesa", limit: 5, ...(officeId ? { officeId } : {}), page: 1 }),
  );

  const stats          = dashData?.stats ?? null;
  const recentPayments = dashData?.recentPayments ?? [];
  const activities     = recentActs?.data ?? [];
  const overdueCases   = overdueRes?.data ?? [];

  const subtitle = `Pasqyrë ${isAdmin ? "Administrator" : "Menaxher"} · ${MONTHS[mo]} ${yr}`;

  const isFirstRun = !loading && stats && stats.activeCases === 0 && stats.totalOutstanding === 0;

  if (error) return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle={subtitle} />
      <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
        Gabim gjatë ngarkimit: {error?.message ?? String(error)}.{" "}
        <button onClick={() => mutate()} className="underline ml-1">Riprovo</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle={subtitle} />
      <div className="p-4 md:p-6 space-y-5">

        {/* Onboarding */}
        {isFirstRun && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                <BarChart3 size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-semibold text-brand-900 mb-1">Mirësevini në Platformën DLR</h3>
                <p className="text-[13px] text-brand-700 mb-3">Filloni duke konfiguruar platformën tuaj.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { step: "1", label: "Shto Institucione",  desc: "Regjistroni institucionet financiare.", href: "/institutions" },
                    { step: "2", label: "Konfiguro Zyret",    desc: "Krijoni zyra dhe shtoni oficerët.",    href: "/admin/reference" },
                    { step: "3", label: "Importo Klientët",   desc: "Ngarkoni portofolio fillestar.",       href: "/reports" },
                  ].map((s) => (
                    <button key={s.step} onClick={() => router.push(s.href)}
                      className="bg-white border border-brand-200 rounded-lg p-3.5 text-left hover:border-brand-400 transition-all">
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center mb-2">{s.step}</div>
                      <div className="text-[12.5px] font-semibold text-gray-900 mb-0.5">{s.label}</div>
                      <div className="text-[11px] text-gray-500">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <KpiCard label="Klient Aktive"      value={loading ? "—" : (stats?.activeCases ?? 0).toLocaleString()}        icon={FolderOpen}    href="/cases"                    loading={loading} />
          <KpiCard label="Arkëtuar Këtë Muaj" value={loading ? "—" : fmtShort(stats?.collectionsThisMonth ?? 0)}        icon={Banknote}       href="/payments"                 loading={loading} />
          <KpiCard label="Premtime Sot"       value={loading ? "—" : (stats?.promisesToday ?? 0).toLocaleString()}      icon={CheckSquare}    href="/cases?view=promises_today" loading={loading} />
          <KpiCard label="Këste me Vonesë"    value={loading ? "—" : (stats?.overdueInstallments ?? 0).toLocaleString()} icon={AlertTriangle}  urgent={(stats?.overdueInstallments ?? 0) > 0} href="/agreements" loading={loading} />
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <h3 className="text-[13px] font-semibold text-gray-900">Treguesit Kryesorë</h3>
          </div>
          {loading || !stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-5 space-y-3">
                  <div className="h-2.5 bg-gray-100 animate-pulse rounded w-24" />
                  <div className="h-7 bg-gray-100 animate-pulse rounded w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-100">
              {[
                { icon: TrendingUp,   label: "Borxhi Total",       val: fmtShort(stats.totalOutstanding ?? 0),            href: "/cases",                    urgent: false },
                { icon: FileCheck,    label: "Marrëveshje Aktive", val: (stats.activeAgreements ?? 0).toLocaleString(),   href: "/agreements",               urgent: false },
                { icon: Scale,        label: "Klient Juridike",    val: (stats.legalCases ?? 0).toLocaleString(),         href: "/legal",                    urgent: false },
                { icon: AlertTriangle,label: "Këste me Vonesë",    val: (stats.overdueInstallments ?? 0).toLocaleString(), href: "/agreements",              urgent: (stats.overdueInstallments ?? 0) > 0 },
              ].map((a) => (
                <button key={a.label} onClick={() => router.push(a.href)}
                  className="flex flex-col gap-2.5 px-5 py-5 text-left hover:bg-gray-50 transition-colors w-full">
                  <div className="flex items-center gap-1.5">
                    <a.icon size={12} className={a.urgent ? "text-red-400" : "text-gray-400"} />
                    <span className="text-[11.5px] text-gray-500 leading-tight">{a.label}</span>
                  </div>
                  <span className={`text-[26px] font-bold tabular leading-none ${a.urgent ? "text-red-600" : "text-gray-900"}`}>
                    {a.val}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {isAdmin && (stats?.officeStats?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Sipas Zyrës</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5">
              {(stats?.officeStats ?? []).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-600 truncate">{o.name}</span>
                  <span className={`font-semibold tabular ml-2 ${o.activeCases > 0 ? "text-gray-900" : "text-gray-300"}`}>{o.activeCases}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team activity + overdue promises */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

          {/* Recent team activities */}
          <Section
            title={isAdmin ? "Aktivitete të Fundit" : "Aktivitete të Ekipit"}
            sub={isAdmin ? "Aktivitetet e fundit të regjistruara" : "Aktivitetet e fundit të ekipit tuaj"}
            action="Shiko të gjitha"
            onAction={() => router.push("/activities")}
          >
            {actsLoading ? <RowSkeleton n={5} /> : activities.length === 0 ? (
              <EmptyRow message="Nuk ka aktivitete të regjistruara" />
            ) : (
              <div className="divide-y divide-gray-50">
                {activities.map((a: any) => {
                  const name = a.case?.loan?.borrower?.fullName ?? "—";
                  const type = ACT_LABEL[a.activityType] ?? formatEnum(a.activityType);
                  return (
                    <div key={a.id} onClick={() => router.push(`/cases/${a.caseId ?? a.case?.id}`)}
                      className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <span className="text-gray-500 text-[9px] font-bold">
                          {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium text-gray-900 truncate">{name}</div>
                        <div className="text-[11px] text-gray-400">
                          {type}{a.officer?.fullName ? ` · ${a.officer.fullName}` : ""}
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 tabular shrink-0">
                        {timeAgo(a.occurredAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Overdue promises needing action */}
          <Section
            title="Premtime me Vonesë"
            sub="Klientë me premtim të kaluar — kërkojnë vëmendje"
            action="Shiko të gjitha"
            onAction={() => router.push("/cases?view=vonesa")}
          >
            {overdueLoading ? <RowSkeleton n={5} /> : overdueCases.length === 0 ? (
              <EmptyRow message="Nuk ka premtime me vonesë" />
            ) : overdueCases.map((c: any) => {
              const p = c.latestPromise;
              const due = p?.promiseDate
                ? new Date(p.promiseDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" })
                : null;
              return (
                <CaseRow key={c.id} c={c}
                  note={due ? `Premtim ${due}${p?.promisedAmount ? ` · ${fmtShort(p.promisedAmount)}` : ""}` : undefined}
                  onClick={() => router.push(`/cases/${c.id}`)} />
              );
            })}
          </Section>
        </div>

        {/* Recent payments */}
        <Section title="Pagesat e Fundit" sub="5 transaksionet e fundit" action="Shiko të gjitha" onAction={() => router.push("/payments")}>
          {loading ? <RowSkeleton n={5} /> : recentPayments.length === 0 ? (
            <EmptyRow message="Nuk ka pagesa të regjistruara akoma" />
          ) : (
            <Table>
              <Thead><tr><Th>Debitor</Th><Th>Shuma</Th><Th>Data</Th><Th>Oficer</Th></tr></Thead>
              <Tbody>
                {recentPayments.map((p: any) => (
                  <Tr key={p.id} onClick={() => router.push(`/cases/${p.case?.id}`)}>
                    <Td><span className="font-medium text-gray-900">{p.case?.loan?.borrower?.fullName ?? "—"}</span></Td>
                    <Td><span className="font-semibold text-gray-900 tabular">{formatCurrency(Number(p.amount))}</span></Td>
                    <Td><span className="tabular text-gray-500">{new Date(p.paymentDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" })}</span></Td>
                    <Td><span className="text-gray-500">{p.officer?.fullName ?? "—"}</span></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Section>

        {/* Reports */}
        {(() => {
          const now2 = new Date();
          const mo2 = now2.getMonth(); const yr2 = now2.getFullYear();
          const monthFrom2 = `${yr2}-${String(mo2 + 1).padStart(2, "0")}-01`;
          const monthTo2   = new Date(yr2, mo2 + 1, 0).toISOString().slice(0, 10);
          const today2     = now2.toISOString().slice(0, 10);
          const officeParam = officeId ? { officeId } : {};
          const actLabel: Record<string, string> = {
            CALL: "Telefonatë", CALL_BORROWER: "Telefonatë", CALL_GUARANTOR: "Telefonatë",
            VISIT: "Vizitë", FIELD_VISIT: "Vizitë", VISIT_BORROWER: "Vizitë",
            MEETING_BORROWER: "Takim", PROMISE_TO_PAY: "Premtim", PAYMENT_RECEIVED: "Pagesë",
            SMS: "SMS", WARNING_LETTER: "Letër", LEGAL_ACTION: "Juridike",
          };
          return (
            <ReportsSection reports={[
              {
                id: "clients-all",
                icon: FolderOpen,
                title: isAdmin ? "Të gjithë Klientët Aktive" : "Klientët e Zyrës",
                desc: isAdmin
                  ? "Portofoli i plotë — borxhi, faza, oficeri dhe kontaktet"
                  : "Klientët aktive të zyrës suaj me borxhin, fazën dhe oficerin",
                run: async () => {
                  const all: any[] = [];
                  let p = 1;
                  while (true) {
                    const r = await casesApi.list({ ...officeParam, page: p, limit: 500 });
                    all.push(...r.data);
                    if (p >= r.meta.pages) break; p++;
                  }
                  downloadExcel(all.map((c: any) => {
                    const b = c.loan?.borrower;
                    const parties = c.loan?.relatedParties ?? [];
                    const guarantors = parties.filter((x: any) => x.role === "GUARANTOR");
                    const coborrower = parties.find((x: any) => x.role === "CO_BORROWER");
                    return {
                      "Ref. Klientit":      c.caseReference ?? "",
                      "Emri i Plotë":       b?.fullName ?? "",
                      "Nr. Personal":       (b?.personalId?.startsWith("NOID-") ? "" : b?.personalId) ?? "",
                      "Telefon":            b?.phones?.[0]?.phoneNumber ?? "",
                      "Adresa":             b?.address ?? "",
                      "Qyteti":             b?.city ?? "",
                      "Banka":              c.loan?.institution?.name ?? "",
                      "Nr. Kredie":         c.loan?.loanNumber ?? "",
                      "Borxhi Aktual (€)":  Number(c.loan?.currentOutstandingBalance ?? 0),
                      "Faza":               FAZA_LABEL_FULL[c.collectionStatus] ?? c.collectionStatus ?? "",
                      "Statusi":            STATUS_LABEL[c.status] ?? c.status ?? "",
                      "Zyrtari Kryesor":    c.assignedOfficer?.fullName ?? "",
                      "Zyrtari Dytësor":    c.secondaryOfficer?.fullName ?? "",
                      "Garant 1":           guarantors[0]?.person?.fullName ?? "",
                      "Garant 2":           guarantors[1]?.person?.fullName ?? "",
                      "Bashkëkreditues":    coborrower?.person?.fullName ?? "",
                      "Data Premtimit":     c.latestPromise?.promiseDate ? new Date(c.latestPromise.promiseDate).toLocaleDateString("sq-AL") : "",
                      "Data Veprimit":      c.nextActionDate ? new Date(c.nextActionDate).toLocaleDateString("sq-AL") : "",
                    };
                  }), `klientet-${today2}`);
                },
              },
              {
                id: "payments-month",
                icon: Banknote,
                title: `Pagesat — ${MONTHS[mo2]} ${yr2}`,
                desc: "Të gjitha pagesat e regjistruara këtë muaj",
                run: async () => {
                  const all: any[] = [];
                  let p = 1;
                  while (true) {
                    const r = await paymentsApi.listAll({ ...officeParam, dateFrom: monthFrom2, dateTo: monthTo2, page: p, limit: 500 });
                    all.push(...r.data);
                    if (p >= r.meta.pages) break; p++;
                  }
                  downloadExcel(all.map((pay: any) => ({
                    "Referenca":       pay.paymentReference ?? "",
                    "Data":            pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString("sq-AL") : "",
                    "Debitori":        pay.case?.loan?.borrower?.fullName ?? "",
                    "Ref. Klientit":   pay.case?.caseReference ?? "",
                    "Nr. Kredie":      pay.case?.loan?.loanNumber ?? "",
                    "Institucioni":    pay.case?.loan?.institution?.shortName ?? "",
                    "Shuma (€)":       pay.amount ? Number(pay.amount) : "",
                    "Oficeri":         pay.officer?.fullName ?? "",
                    "Shënime":         pay.notes ?? "",
                  })), `pagesat-${MONTHS[mo2].toLowerCase()}-${yr2}`);
                },
              },
              {
                id: "overdue-clients",
                icon: AlertTriangle,
                title: "Klientët me Vonesë",
                desc: "Klientët me premtim të kaluar pa pagesë — kërkojnë vëmendje urgjente",
                run: async () => {
                  const all: any[] = [];
                  let p = 1;
                  while (true) {
                    const r = await casesApi.list({ ...officeParam, view: "vonesa", page: p, limit: 500 });
                    all.push(...r.data);
                    if (p >= r.meta.pages) break; p++;
                  }
                  downloadExcel(all.map((c: any) => ({
                    "Ref. Klientit":       c.caseReference ?? "",
                    "Emri i Plotë":        c.loan?.borrower?.fullName ?? "",
                    "Telefon":             c.loan?.borrower?.phones?.[0]?.phoneNumber ?? "",
                    "Borxhi Aktual (€)":   Number(c.loan?.currentOutstandingBalance ?? 0),
                    "Faza":                FAZA_LABEL_FULL[c.collectionStatus] ?? c.collectionStatus ?? "",
                    "Data Premtimit":      c.latestPromise?.promiseDate ? new Date(c.latestPromise.promiseDate).toLocaleDateString("sq-AL") : "",
                    "Shuma Premtimit (€)": c.latestPromise?.promisedAmount ? Number(c.latestPromise.promisedAmount) : "",
                    "Ditë Vonesë":         c.latestPromise?.promiseDate ? Math.floor((Date.now() - new Date(c.latestPromise.promiseDate).getTime()) / 86400000) : "",
                    "Zyrtari Kryesor":     c.assignedOfficer?.fullName ?? "",
                  })), `vonesa-${today2}`);
                },
              },
              {
                id: "activities-month",
                icon: Clock,
                title: `Aktivitetet — ${MONTHS[mo2]} ${yr2}`,
                desc: isAdmin ? "Të gjitha aktivitetet e regjistruara këtë muaj" : "Aktivitetet e ekipit tuaj këtë muaj",
                run: async () => {
                  const all: any[] = [];
                  let p = 1;
                  while (true) {
                    const r = await activitiesApi.listAll({ ...officeParam, from: monthFrom2, to: monthTo2, page: p, limit: 500 });
                    all.push(...r.data);
                    if (p >= r.meta.pages) break; p++;
                  }
                  downloadExcel(all.map((a: any) => ({
                    "Data":          a.occurredAt ? new Date(a.occurredAt).toLocaleDateString("sq-AL") : "",
                    "Ora":           a.occurredAt ? new Date(a.occurredAt).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" }) : "",
                    "Lloji":         actLabel[a.activityType] ?? formatEnum(a.activityType ?? ""),
                    "Debitori":      a.case?.loan?.borrower?.fullName ?? "",
                    "Ref. Klientit": a.case?.caseReference ?? "",
                    "Oficeri":       a.officer?.fullName ?? "",
                    "Zyra":          a.officer?.office?.name ?? "",
                    "Shënime":       a.notes ?? "",
                  })), `aktivitetet-${MONTHS[mo2].toLowerCase()}-${yr2}`);
                },
              },
            ]} />
          );
        })()}

      </div>
    </div>
  );
}

// ── VIEWER dashboard ──────────────────────────────────────────────────────────

function ViewerDashboard() {
  const router = useRouter();
  const now = new Date();
  const yr = now.getFullYear(); const mo = now.getMonth();

  const { data: stats, error, isLoading: loading, mutate } = useSWR(
    "viewer-dashboard",
    () => casesApi.dashboardStats(),
    { revalidateOnFocus: true },
  );

  if (error) return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle="Pasqyrë e portofolit" />
      <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
        Gabim: {error?.message ?? String(error)}.{" "}
        <button onClick={() => mutate()} className="underline ml-1">Riprovo</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle={`Pasqyrë e portofolit · ${MONTHS[mo]} ${yr}`} />
      <div className="p-4 md:p-6 space-y-5">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <KpiCard label="Borxhi Aktual"      value={loading ? "—" : fmtShort(stats?.totalOutstanding ?? 0)}      icon={AlertCircle}  loading={loading} />
          <KpiCard label="Arkëtuar Këtë Muaj" value={loading ? "—" : fmtShort(stats?.collectionsThisMonth ?? 0)} icon={Banknote}      loading={loading} />
          <KpiCard label="Klient Aktive"       value={loading ? "—" : (stats?.activeCases ?? 0).toLocaleString()} icon={FolderOpen}   href="/cases"      loading={loading} />
          <KpiCard label="Klient Juridike"     value={loading ? "—" : (stats?.legalCases ?? 0).toLocaleString()}  icon={Scale}        href="/legal"      loading={loading} />
        </div>

        {(stats?.officeStats?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Sipas Zyrës</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <div className="h-2.5 bg-gray-100 animate-pulse rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                  <div className="h-2.5 w-6 bg-gray-100 animate-pulse rounded" />
                </div>
              )) : (stats?.officeStats ?? []).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-600 truncate">{o.name}</span>
                  <span className={`font-semibold tabular ml-2 ${o.activeCases > 0 ? "text-gray-900" : "text-gray-300"}`}>{o.activeCases}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle="Duke ngarkuar…" />
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-gray-100 animate-pulse rounded w-20" />
                <div className="h-5 bg-gray-100 animate-pulse rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const role = user?.role ?? "VIEWER";
  if (role === "OFFICER") return <OfficerDashboard user={user} />;
  if (role === "ADMIN")   return <ManagerDashboard user={user} isAdmin />;
  if (role === "MANAGER") return <ManagerDashboard user={user} isAdmin={false} />;
  return <ViewerDashboard />;
}
