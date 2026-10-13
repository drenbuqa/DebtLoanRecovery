"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/utils";
import { cases as casesApi, payments as paymentsApi, performance as perfApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatEnum } from "@/lib/utils";
import { CollectionsChart } from "@/components/charts/CollectionsChart";
import {
  TrendingUp, Scale, ArrowUpRight,
  FolderOpen, MapPin, ChevronRight,
  BarChart3, CheckSquare, AlertCircle, FileCheck,
  Phone, Calendar, Banknote, AlertTriangle, Target,
} from "lucide-react";

const MONTHS = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];

function fmtShort(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `€${(v / 1_000).toFixed(0)}k`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(1)}k`;
  return `€${v}`;
}

const STAGE_COLOR: Record<string, string> = {
  D1: "bg-amber-50 text-amber-700",
  D2: "bg-amber-100 text-amber-800",
  D3: "bg-red-50 text-red-600",
  D4: "bg-red-100 text-red-700",
  LEGAL: "bg-brand-50 text-brand-700",
};

// ── KPI Card ─────────────────────────────────────────────────────────────────

type KpiVariant = "default" | "success" | "warning" | "danger" | "brand";

const VARIANT_STYLES: Record<KpiVariant, { iconBg: string; iconColor: string; valueColor: string }> = {
  default: { iconBg: "bg-gray-100", iconColor: "text-gray-500", valueColor: "text-gray-900" },
  success: { iconBg: "bg-emerald-100", iconColor: "text-emerald-600", valueColor: "text-emerald-700" },
  warning: { iconBg: "bg-amber-100", iconColor: "text-amber-600", valueColor: "text-amber-700" },
  danger:  { iconBg: "bg-red-100",    iconColor: "text-red-600",    valueColor: "text-red-700"    },
  brand:   { iconBg: "bg-brand-100",  iconColor: "text-brand-600",  valueColor: "text-brand-700"  },
};

function KpiCard({
  label, value, icon: Icon, variant = "default", href, loading,
}: {
  label: string; value: string | number; icon: React.ElementType;
  variant?: KpiVariant; href?: string; loading?: boolean;
}) {
  const s = VARIANT_STYLES[variant];
  const inner = loading ? (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-gray-100 animate-pulse rounded w-20" />
        <div className="h-5 bg-gray-100 animate-pulse rounded w-14" />
      </div>
    </div>
  ) : (
    <div className={`bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 transition-all ${href ? "hover:border-gray-300 hover:shadow-sm cursor-pointer" : ""}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>
        <Icon size={16} className={s.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-medium text-gray-400 uppercase tracking-wide leading-none mb-1">{label}</div>
        <div className={`text-[19px] font-bold tabular leading-none ${s.valueColor}`}>{value}</div>
      </div>
      {href && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
    </div>
  );
  if (href && !loading) return <a href={href} className="block">{inner}</a>;
  return inner;
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function RowSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 animate-pulse rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
            <div className="h-2 bg-gray-100 animate-pulse rounded w-24" />
          </div>
          <div className="w-10 h-4 bg-gray-100 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ title, sub, action, onAction, children }: {
  title: string; sub?: string;
  action?: string; onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
          {sub && <p className="text-[11.5px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {action && onAction && (
          <button onClick={onAction}
            className="text-[12px] text-brand-600 font-medium hover:underline flex items-center gap-1">
            {action} <ArrowUpRight size={12} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon size={18} className="text-gray-300" />
      </div>
      <p className="text-[12.5px] text-gray-400 text-center">{message}</p>
    </div>
  );
}

// ── Nav tile ──────────────────────────────────────────────────────────────────

function NavTile({ icon: Icon, label, sub, href }: { icon: React.ElementType; label: string; sub?: string; href: string }) {
  return (
    <a href={href} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 hover:border-brand-300 hover:shadow-sm transition-all group"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
        <Icon size={15} className="text-brand-600" />
      </div>
      <div>
        <div className="text-[12.5px] font-semibold text-gray-800">{label}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </a>
  );
}

// ── OFFICER dashboard ─────────────────────────────────────────────────────────

function OfficerDashboard({ user }: { user: any }) {
  const router = useRouter();
  const now = new Date();
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

  const { data: promiseRes, isLoading: promiseLoading } = useSWR(
    user?.id ? ["officer-promises", user.id] : null,
    () => casesApi.list({ officerId: user.id, view: "all_promises", limit: 5, page: 1 }),
  );

  const allCases     = myCasesRes?.data ?? [];
  const activeCases  = myCasesRes?.meta?.total ?? allCases.length;
  const todayCases   = allCases.filter((c: any) => c.nextActionDate?.slice(0, 10) === todayISO);
  const promiseCases = promiseRes?.data ?? [];

  const collectedThisMonth = myPerf?.primary?.collectedAmount ?? 0;
  const callsThisMonth     = myPerf?.primary?.calls ?? 0;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Mirëmëngjes" : hour < 17 ? "Mirëdita" : "Mirëmbrëma";
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  const loading = casesLoading || perfLoading;

  return (
    <div className="flex flex-col">
      <Topbar
        title="Ballina Ime"
        subtitle={`${greeting}, ${firstName} · ${MONTHS[mo]} ${now.getDate()}, ${yr}`}
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <KpiCard label="Klient Aktive"      value={loading ? "—" : activeCases.toLocaleString()}     icon={FolderOpen}  variant="brand"   href="/cases"   loading={loading} />
          <KpiCard label="Telefonata Këtë Muaj" value={loading ? "—" : callsThisMonth.toLocaleString()}  icon={Phone}       variant="default" loading={loading} />
          <KpiCard label="Arkëtuar Këtë Muaj" value={loading ? "—" : fmtShort(collectedThisMonth)}      icon={Banknote}    variant="success" loading={loading} />
          <KpiCard label="Ndjekje Sot"        value={loading ? "—" : todayCases.length.toLocaleString()} icon={Calendar}    variant={todayCases.length > 0 ? "warning" : "default"} loading={loading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">

          {/* Today's follow-ups */}
          <div className="md:col-span-2 space-y-4">
            <SectionCard title="Ndjekje Sot" sub="Klientët me datë veprimi sot" action="Të gjithë" onAction={() => router.push("/cases")}>
              {casesLoading ? <RowSkeleton n={3} /> : todayCases.length === 0 ? (
                <EmptyState icon={Calendar} message="Nuk ka ndjekje të planifikuara për sot" />
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayCases.slice(0, 5).map((c: any) => {
                    const name = c.loan?.borrower?.fullName ?? "—";
                    const stage = c.collectionStage ?? "—";
                    return (
                      <div key={c.id} onClick={() => router.push(`/cases/${c.id}`)}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                          <span className="text-brand-600 text-[10px] font-bold">
                            {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-gray-900 truncate">{name}</div>
                          <div className="text-[11px] text-gray-400">{c.caseReference}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded tracking-wide ${STAGE_COLOR[stage] ?? "bg-gray-100 text-gray-500"}`}>
                            {formatEnum(stage)}
                          </span>
                          <ChevronRight size={13} className="text-gray-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Promise pipeline */}
            <SectionCard title="Premtime Aktive" sub="Klientët me premtim pagese aktiv" action="Shiko të gjitha" onAction={() => router.push("/cases?view=all_promises")}>
              {promiseLoading ? <RowSkeleton n={3} /> : promiseCases.length === 0 ? (
                <EmptyState icon={Target} message="Nuk ka premtime aktive" />
              ) : (
                <div className="divide-y divide-gray-50">
                  {promiseCases.map((c: any) => {
                    const name = c.loan?.borrower?.fullName ?? "—";
                    const p = c.latestPromise;
                    const dueDate = p?.promiseDate ? new Date(p.promiseDate) : null;
                    const isOverdue = dueDate && dueDate < now;
                    return (
                      <div key={c.id} onClick={() => router.push(`/cases/${c.id}`)}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-50" : "bg-amber-50"}`}>
                          <Target size={13} className={isOverdue ? "text-red-500" : "text-amber-500"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-gray-900 truncate">{name}</div>
                          <div className="text-[11px] text-gray-400">
                            {p?.promisedAmount ? fmtShort(p.promisedAmount) : "—"}
                            {dueDate ? ` · ${dueDate.toLocaleDateString("sq-AL", { day: "2-digit", month: "long" })}` : ""}
                          </div>
                        </div>
                        {isOverdue && <span className="text-[11px] text-red-500 font-medium shrink-0">Me vonesë</span>}
                        <ChevronRight size={13} className="text-gray-300 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
              <NavTile icon={FolderOpen}  label="Klientët e Mia"     sub="Portofoli juaj"         href="/cases" />
              <NavTile icon={Phone}       label="Aktivitete"          sub="Histori & regjistrim"   href="/activities" />
              <NavTile icon={MapPin}      label="Vizita"              sub="Vizita në terren"       href="/activities?type=visit" />
              <NavTile icon={BarChart3}   label="Performanca"         sub="Statistikat e mia"      href="/performance" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── MANAGER / ADMIN dashboard ─────────────────────────────────────────────────

function ManagerDashboard({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const router = useRouter();
  const now = new Date();
  const yr = now.getFullYear(); const mo = now.getMonth();
  const monthFrom = new Date(yr, mo, 1).toISOString().slice(0, 10);
  const officeId = isAdmin ? undefined : user?.officeId;

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

  const stats         = dashData?.stats ?? null;
  const recentPayments = dashData?.recentPayments ?? [];

  const allMonths = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`),
  [now.getFullYear()]);

  const monthlyData = useMemo(() => {
    const apiMonthly: Record<string, number> = {};
    for (const m of (stats?.monthlyCollections ?? [])) apiMonthly[m.month] = m.total;
    return allMonths.map((month) => ({ month, total: apiMonthly[month] ?? 0 }));
  }, [stats?.monthlyCollections, allMonths]);

  const currentMonth = `${yr}-${String(mo + 1).padStart(2, "0")}`;
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
      <Topbar title="Ballina" subtitle={subtitle} help={[
        { title: "Shifrat kryesore", body: "Gjendja e portofolit tuaj — borxhi aktual, arketimet këtë muaj, premtimet aktive dhe këste me vonesë." },
        { title: "Grafiku i arkëtimeve", body: "Klikoni mbi çdo muaj të grafiku për të parë shumën e arkëtuar atë muaj." },
        { title: "Alarmet", body: "Premtimet sot dhe këste me vonesë kërkojnë vëmendje të menjëhershme." },
      ]} />

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
                    { step: "1", label: "Shto Institucione", desc: "Regjistroni institucionet financiare.", href: "/institutions" },
                    { step: "2", label: "Konfiguro Zyret", desc: "Krijoni zyra dhe shtoni oficerët.", href: "/admin/reference" },
                    { step: "3", label: "Importo Klientët", desc: "Ngarkoni portofolio fillestar.", href: "/reports" },
                  ].map((s) => (
                    <button key={s.step} onClick={() => router.push(s.href)}
                      className="bg-white border border-brand-200 rounded-lg p-3.5 text-left hover:border-brand-400 hover:shadow-sm transition-all">
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
          <KpiCard label="Klient Aktive"       value={loading ? "—" : stats?.activeCases?.toLocaleString() ?? "—"}              icon={FolderOpen}   variant="brand"   href="/cases"                       loading={loading} />
          <KpiCard label="Arkëtuar Këtë Muaj"  value={loading ? "—" : fmtShort(stats?.collectionsThisMonth ?? 0)}               icon={Banknote}     variant="success" href="/payments"                     loading={loading} />
          <KpiCard label="Premtime Sot"        value={loading ? "—" : (stats?.promisesToday ?? 0).toLocaleString()}             icon={CheckSquare}  variant={stats?.promisesToday > 0 ? "warning" : "default"} href="/cases?view=promises_today" loading={loading} />
          <KpiCard label="Këste me Vonesë"     value={loading ? "—" : (stats?.overdueInstallments ?? 0).toLocaleString()}       icon={AlertTriangle} variant={stats?.overdueInstallments > 0 ? "danger" : "default"} href="/agreements" loading={loading} />
        </div>

        {/* Chart + Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:items-stretch">

          {/* Monthly chart */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">Arkëtime Mujore {yr}</h3>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Para të arkëtuara — EUR</p>
              </div>
              {!loading && stats && (
                <div className="text-right">
                  <div className="text-[10.5px] text-gray-400 uppercase tracking-wide">Këtë muaj</div>
                  <div className="text-[18px] font-bold text-brand-700 tabular leading-tight">
                    {fmtShort(monthlyData[mo]?.total ?? 0)}
                  </div>
                </div>
              )}
            </div>
            <div className="px-3 pt-1 pb-3 flex-1">
              {loading
                ? <div className="aspect-[5/3] animate-pulse bg-gray-50 rounded-lg flex items-end justify-around px-4 pb-4 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${30 + (i % 4) * 15}%`, opacity: 0.5 + (i % 3) * 0.2 }} />
                    ))}
                  </div>
                : <CollectionsChart data={monthlyData} currentMonth={currentMonth} />}
            </div>
          </div>

          {/* Needs attention + navigation */}
          <div className="flex flex-col gap-4">

            {/* Alerts */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Kërkon Vëmendje</h3>
              <div className="space-y-1">
                {loading || !stats ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                    <div className="flex-1 h-3 bg-gray-100 animate-pulse rounded" />
                    <div className="w-7 h-3 bg-gray-100 animate-pulse rounded" />
                  </div>
                )) : [
                  { icon: CheckSquare,  label: "Premtime pagese sot",  val: stats.promisesToday,       href: "/cases?view=promises_today", hot: stats.promisesToday > 0       },
                  { icon: AlertCircle,  label: "Këste me vonesë",      val: stats.overdueInstallments, href: "/agreements",                hot: stats.overdueInstallments > 0 },
                  { icon: Scale,        label: "Klient juridike",       val: stats.legalCases,          href: "/legal",                     hot: false                         },
                  { icon: FileCheck,    label: "Marrëveshje aktive",   val: stats.activeAgreements,    href: "/agreements",                hot: false                         },
                ].map((a) => (
                  <button key={a.label} onClick={() => router.push(a.href)}
                    className="flex items-center gap-2.5 py-1 w-full hover:opacity-80 transition-opacity text-left group">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${a.hot ? "bg-amber-50" : "bg-gray-50"}`}>
                      <a.icon size={12} className={a.hot ? "text-amber-500" : "text-gray-400"} />
                    </div>
                    <span className="flex-1 text-[12px] text-gray-600">{a.label}</span>
                    <span className={`text-[13px] font-bold tabular ${a.hot ? "text-amber-600" : "text-gray-900"}`}>{a.val}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Office breakdown */}
            {!isAdmin && stats?.officeStats?.length === 0 ? null : (
              <div className="bg-white rounded-xl border border-gray-200 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Sipas Zyrës</h3>
                <div className="space-y-1.5">
                  {loading || !stats ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5">
                      <div className="h-2.5 bg-gray-100 animate-pulse rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                      <div className="h-2.5 w-6 bg-gray-100 animate-pulse rounded" />
                    </div>
                  )) : (stats.officeStats ?? []).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-600">{o.name}</span>
                      <span className={`font-semibold tabular ${o.activeCases > 0 ? "text-gray-900" : "text-gray-300"}`}>{o.activeCases}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation tiles */}
        <div>
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Shfleto Platformën</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NavTile icon={TrendingUp} label="Performanca"   sub="KPI-të e oficerëve"     href="/performance" />
            <NavTile icon={FolderOpen} label="Klientët"      sub="Portofoli i plotë"       href="/cases" />
            <NavTile icon={Banknote}   label="Pagesat"        sub="Arkëtimet"              href="/payments" />
            <NavTile icon={BarChart3}  label="Raporte"        sub="Eksport & analitikë"    href="/reports" />
          </div>
        </div>

        {/* Recent payments */}
        <SectionCard title="Pagesat e Fundit" sub="5 transaksionet e fundit" action="Shiko të gjitha" onAction={() => router.push("/payments")}>
          {loading ? <RowSkeleton n={5} /> : recentPayments.length === 0 ? (
            <EmptyState icon={Banknote} message="Nuk ka pagesa të regjistruara akoma" />
          ) : (
            <Table>
              <Thead><tr><Th>Debitor</Th><Th>Shuma</Th><Th>Data</Th><Th>Oficer</Th></tr></Thead>
              <Tbody>
                {recentPayments.map((p: any) => (
                  <Tr key={p.id} onClick={() => router.push(`/cases/${p.case?.id}`)}>
                    <Td><span className="font-medium text-gray-900">{p.case?.loan?.borrower?.fullName ?? "—"}</span></Td>
                    <Td><span className="font-semibold text-emerald-700 tabular">{formatCurrency(Number(p.amount))}</span></Td>
                    <Td><span className="tabular text-gray-500">{new Date(p.paymentDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short" })}</span></Td>
                    <Td><span className="text-gray-500">{p.officer?.fullName ?? "—"}</span></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </SectionCard>

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

  const allMonths = Array.from({ length: 12 }, (_, i) =>
    `${yr}-${String(i + 1).padStart(2, "0")}`
  );
  const monthlyData = useMemo(() => {
    const apiMonthly: Record<string, number> = {};
    for (const m of (stats?.monthlyCollections ?? [])) apiMonthly[m.month] = m.total;
    return allMonths.map((month) => ({ month, total: apiMonthly[month] ?? 0 }));
  }, [stats?.monthlyCollections]);

  const currentMonth = `${yr}-${String(mo + 1).padStart(2, "0")}`;

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
          <KpiCard label="Borxhi Aktual"       value={loading ? "—" : fmtShort(stats?.totalOutstanding ?? 0)}         icon={AlertCircle} variant="default" href="/cases"              loading={loading} />
          <KpiCard label="Arkëtuar Këtë Muaj"  value={loading ? "—" : fmtShort(stats?.collectionsThisMonth ?? 0)}    icon={Banknote}    variant="success" href="/payments"           loading={loading} />
          <KpiCard label="Klient Aktive"        value={loading ? "—" : (stats?.activeCases ?? 0).toLocaleString()}    icon={FolderOpen}  variant="brand"   href="/cases"              loading={loading} />
          <KpiCard label="Klient Juridike"      value={loading ? "—" : (stats?.legalCases ?? 0).toLocaleString()}     icon={Scale}       variant="default" href="/legal"              loading={loading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch">
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">Arkëtime Mujore {yr}</h3>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Para të arkëtuara — EUR</p>
              </div>
              {!loading && stats && (
                <div className="text-right">
                  <div className="text-[10.5px] text-gray-400 uppercase tracking-wide">Këtë muaj</div>
                  <div className="text-[18px] font-bold text-brand-700 tabular leading-tight">
                    {fmtShort(monthlyData[mo]?.total ?? 0)}
                  </div>
                </div>
              )}
            </div>
            <div className="px-3 pt-1 pb-3 flex-1">
              {loading
                ? <div className="aspect-[5/3] animate-pulse bg-gray-50 rounded-lg flex items-end justify-around px-4 pb-4 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${30 + (i % 4) * 15}%`, opacity: 0.5 + (i % 3) * 0.2 }} />
                    ))}
                  </div>
                : <CollectionsChart data={monthlyData} currentMonth={currentMonth} />}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Sipas Zyrës</h3>
              <div className="space-y-1.5">
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <div className="h-2.5 bg-gray-100 animate-pulse rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                    <div className="h-2.5 w-6 bg-gray-100 animate-pulse rounded" />
                  </div>
                )) : (stats?.officeStats ?? []).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-600">{o.name}</span>
                    <span className={`font-semibold tabular ${o.activeCases > 0 ? "text-gray-900" : "text-gray-300"}`}>{o.activeCases}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <NavTile icon={TrendingUp} label="Performanca" href="/performance" />
              <NavTile icon={FolderOpen} label="Klientët"    href="/cases" />
              <NavTile icon={BarChart3}  label="Raporte"     href="/reports" />
              <NavTile icon={Scale}      label="Juridike"    href="/legal" />
            </div>
          </div>
        </div>
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
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 bg-gray-100 animate-pulse rounded w-20" />
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
