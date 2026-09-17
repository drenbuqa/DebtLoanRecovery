"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { cases as casesApi, payments as paymentsApi, performance as perfApi, offices as officesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatEnum } from "@/lib/utils";
import {
  TrendingUp, Clock, Scale,
  Users, ArrowUpRight, RefreshCw, FolderOpen,
  MapPin, Circle, ChevronRight, BarChart3,
  CheckSquare, AlertCircle, FileCheck,
} from "lucide-react";

const MONTHS = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];

function fmtVal(v: number) {
  if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `€${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `€${v}`;
}

function fmtNum(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

const STAGE_COLOR: Record<string, string> = {
  D1: "bg-amber-50 text-amber-700",
  D2: "bg-amber-100 text-amber-800",
  D3: "bg-red-50 text-red-600",
  D4: "bg-red-100 text-red-700",
  LEGAL: "bg-brand-50 text-brand-700",
  WRITTEN_OFF: "bg-gray-100 text-gray-500",
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH: "bg-red-400", MEDIUM: "bg-amber-400", LOW: "bg-gray-300",
};

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={20} className="animate-spin text-gray-300" />
    </div>
  );
}

// ── Collections bar chart ────────────────────────────────────────────────────
function fmtAxis(v: number) {
  if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `€${(v / 1000).toFixed(0)}k`;
  return `€${v}`;
}

function computeYAxis(maxRaw: number): { max: number; ticks: number[] } {
  if (maxRaw <= 0) return { max: 1000, ticks: [250, 500, 750, 1000] };

  // Target ~4 ticks with a "nice" step size
  const roughStep = maxRaw / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / mag;

  // Round norm UP to nearest nice multiplier so labels are always whole numbers
  let niceMult: number;
  if (norm <= 1) niceMult = 1;
  else if (norm <= 1.5) niceMult = 1.5;
  else if (norm <= 2) niceMult = 2;
  else if (norm <= 2.5) niceMult = 2.5;
  else if (norm <= 5) niceMult = 5;
  else niceMult = 10;

  const step = niceMult * mag;
  // Enough ticks so the axis top exceeds maxRaw by at least 5% (breathing room)
  const nTicks = Math.ceil((maxRaw * 1.05) / step);
  const max = nTicks * step;
  const ticks = Array.from({ length: nTicks }, (_, i) => step * (i + 1));
  return { max, ticks };
}

function CollectionsChart({ data, currentMonth }: { data: { month: string; total: number }[]; currentMonth: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const W = 600; const H = 360;
  const PL = 46; const PR = 16; const PT = 28; const PB = 30;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = data.length;
  const colW = chartW / n;
  const barW = Math.max(Math.floor(colW * 0.5), 8);

  const maxRaw = Math.max(...data.map((d) => d.total), 1);
  const { max: mx, ticks: yTicks } = computeYAxis(maxRaw);

  const now = new Date();
  const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="ccGradCur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="ccGradPast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#ede9fe" />
          </linearGradient>
          <linearGradient id="ccGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="ccGradPastHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#ddd6fe" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTicks.map((tick) => {
          const y = PT + chartH * (1 - tick / mx);
          return (
            <g key={tick}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PL - 6} y={y + 3.5} textAnchor="end" fontSize={9} fill="#d1d5db" fontFamily="system-ui, sans-serif">
                {fmtAxis(tick)}
              </text>
            </g>
          );
        })}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="#e5e7eb" strokeWidth={1} />

        {/* Bars */}
        {data.map((d, i) => {
          const [yr, mo] = d.month.split("-");
          const label = MONTHS[parseInt(mo) - 1];
          const isCurrent = d.month === currentMonth;
          const isFuture = d.month > nowMonth;
          const isHov = hovered === i;
          const hasData = d.total > 0;
          const cx = PL + colW * i + colW / 2;
          const x = cx - barW / 2;
          const barH = hasData ? Math.max((d.total / mx) * chartH, 3) : 0;
          const y = PT + chartH - barH;

          let fill = isFuture ? "#f9fafb" : hasData ? "url(#ccGradPast)" : "#f3f4f6";
          if (isCurrent) fill = "url(#ccGradCur)";
          if (isHov && hasData && !isCurrent) fill = "url(#ccGradPastHover)";
          if (isHov && isCurrent) fill = "url(#ccGradHover)";

          return (
            <g key={d.month}
              onMouseEnter={() => !isFuture && setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: hasData && !isFuture ? "pointer" : "default" }}>
              {/* Invisible hit area */}
              <rect x={PL + colW * i} y={PT} width={colW} height={chartH + PB} fill="transparent" />
              {/* Bar */}
              {(hasData || !isFuture) && (
                <rect x={x} y={hasData ? y : PT + chartH - 2} width={barW} height={hasData ? barH : 2}
                  rx={hasData ? 3 : 1} fill={fill}
                  style={{ transition: "fill 0.12s ease" }} />
              )}
              {/* Month label */}
              <text x={cx} y={PT + chartH + 18} textAnchor="middle" fontSize={10}
                fontWeight={isCurrent ? "600" : "400"}
                fill={isCurrent ? "#6d28d9" : isHov ? "#4b5563" : "#9ca3af"}
                fontFamily="system-ui, sans-serif"
                style={{ transition: "fill 0.1s" }}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && data[hovered] && (() => {
        const d = data[hovered];
        const hasData = d.total > 0;
        const isCurrent = d.month === currentMonth;
        const barH = hasData ? Math.max((d.total / mx) * chartH, 3) : 0;
        const barTop = PT + chartH - barH;
        const leftPct = ((PL + colW * hovered + colW / 2) / W) * 100;
        const topPct = (barTop / H) * 100;
        return (
          <div style={{ position: "absolute", top: `${topPct}%`, left: `${leftPct}%`, transform: "translate(-50%, -100%) translateY(-6px)", pointerEvents: "none", zIndex: 10 }}>
            <div className={`px-2.5 py-1 rounded-lg border text-center whitespace-nowrap ${isCurrent ? "bg-brand-600 border-brand-500 text-white" : "bg-gray-900 border-gray-800 text-white"}`}
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
              <div className="text-[12px] font-bold tabular">{hasData ? fmtVal(d.total) : "Nuk ka të dhëna"}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, alert, href }: { label: string; value: string; alert?: boolean; href?: string }) {
  const inner = (
    <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 md:px-5 md:py-4 h-full flex flex-col justify-between min-h-[62px] md:min-h-0" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="text-[10px] md:text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-snug">{label}</div>
      <div className="text-[17px] md:text-[22px] font-bold tabular leading-tight mt-auto text-gray-900">{value}</div>
      {alert && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />}
    </div>
  );
  if (href) return <a href={href} className="block h-full">{inner}</a>;
  return inner;
}

// ── OFFICER dashboard ─────────────────────────────────────────────────────────
function OfficerDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();

  useEffect(() => {
    if (!user?.id) return;
    casesApi.list({ officerId: user.id, limit: 8, page: 1 })
      .then((c) => setCases(c.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Mirëmëngjes" : hour < 17 ? "Mirëdita" : "Mirëmbrëma";
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col">
      <Topbar
        title="Ballina Ime"
        subtitle={`${greeting}, ${firstName} · ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`}
        help={[
          { title: "Dosjet tuaja", body: "Këtu shfaqen vetëm dosjet që ju janë caktuar. Klikoni mbi çdo rresht për të hapur detajet e plota — informacionin e debitorit, historikun e pagesave dhe veprimet e ndërmarra." },
          { title: "Si të regjistroni një telefonatë ose pagesë", body: "Klikoni mbi një dosje për ta hapur, pastaj përdorni butonat e veprimit në të djathtën e sipërme — 'Regjistro Aktivitet' për telefonata dhe vizita, 'Regjistro Pagesën' kur është marrë para." },
        ]}
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Dosjet e Mia" value={loading ? "—" : fmtNum(cases.length)} href="/cases" />
          <KpiCard label="Aktivitete Sot" value="→" href="/activities" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* My cases */}
          <div className="md:col-span-2">
            <Card padding="none">
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-900">Dosjet e Mia</h3>
                  <p className="text-[12px] text-gray-400">Dosjet e caktuara tek ju</p>
                </div>
                <button onClick={() => router.push("/cases")}
                  className="text-[12px] text-brand-600 font-medium hover:underline transition-colors flex items-center gap-1">
                  Shiko të gjitha <ArrowUpRight size={12} />
                </button>
              </div>
              {loading ? <Spinner /> : cases.length === 0 ? (
                <div className="px-5 py-10 text-center text-[13px] text-gray-400">Nuk ka dosje të caktuara tek ju akoma</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cases.map((c) => {
                    const name = c.loan?.borrower ? `${c.loan.borrower.fullName}` : "—";
                    const stage = c.collectionStage ?? "—";
                    const nextAction = c.nextActionDate ? new Date(c.nextActionDate) : null;
                    const isOverdue = nextAction && nextAction < now;
                    return (
                      <div key={c.id} onClick={() => router.push(`/cases/${c.id}`)}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                          <FolderOpen size={13} className="text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-gray-900 truncate">{name}</div>
                          <div className="text-[11px] text-gray-400">{c.caseReference} · {c.loan?.loanNumber ?? "—"}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded tracking-wide ${STAGE_COLOR[stage] ?? "bg-gray-100 text-gray-500"}`}>{formatEnum(stage)}</span>
                          {nextAction && (
                            <span className={`text-[11px] ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                              {isOverdue ? "Me vonesë" : nextAction.toLocaleDateString("sq-AL", { day: "2-digit", month: "long" })}
                            </span>
                          )}
                          <ChevronRight size={13} className="text-gray-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-4">
            <Card>
              <h3 className="text-[12px] font-semibold text-gray-700 mb-3 uppercase tracking-wide">Veprime të shpejta</h3>
              <div className="space-y-1">
                {[
                  { label: "Dosjet e mia", href: "/cases", icon: FolderOpen },
                  { label: "Vizita në terren", href: "/activities", icon: MapPin },
                  { label: "Aktivitete të fundit", href: "/activities", icon: Clock },
                ].map((l) => (
                  <button key={l.href} onClick={() => router.push(l.href)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <l.icon size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[12.5px] text-gray-700">{l.label}</span>
                    <ChevronRight size={12} className="text-gray-300 ml-auto" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── MANAGER dashboard ─────────────────────────────────────────────────────────
function ManagerDashboard({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();

  function getMonthRange() {
    const yr = now.getFullYear(); const mo = now.getMonth();
    const from = new Date(yr, mo, 1).toISOString().slice(0, 10);
    const to = new Date(yr, mo + 1, 0).toISOString().slice(0, 10);
    return { from, to };
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const { from, to } = getMonthRange();
      const officeId = isAdmin ? undefined : user?.officeId;
      const [s, p, o] = await Promise.all([
        casesApi.dashboardStats(officeId),
        paymentsApi.list({ limit: 5, ...(officeId ? { officeId } : {}) }),
        perfApi.officers({ from, to }),
      ]);
      setStats(s);
      setRecentPayments(p.data);
      setOfficers(o ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const allMonths = Array.from({ length: 12 }, (_, i) =>
    `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`
  );
  const apiMonthly: Record<string, number> = {};
  for (const m of (stats?.monthlyCollections ?? [])) apiMonthly[m.month] = m.total;
  const monthlyData = allMonths.map((month) => ({ month, total: apiMonthly[month] ?? 0 }));
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const subtitle = `Pasqyrë ${isAdmin ? "Administrator" : "Menaxher"} · ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  if (error) return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle={subtitle} />
      <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
        Gabim gjatë ngarkimit të ballinës: {error}. <button onClick={load} className="underline ml-1">Riprovo</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle={subtitle} help={[
        { title: "Shifrat kryesore", body: "Këto tregojnë të dhënat më të rëndësishme të portofolit tuaj — gjendja debitore totale, shuma e arkëtuar këtë muaj, numri i dosjeve aktive dhe debitorët që premtuan pagesë sot. Klikoni çdo shifër për të parë listën e plotë." },
        { title: "Grafiku i arkëtimeve mujore", body: "Grafiku me shtylla tregon sa para u arkëtuan çdo muaj këtë vit. Vendosni kursorin mbi një shtyllë për të parë shumën e saktë. Një shtyllë më e lartë do të thotë muaj më i mirë." },
        { title: "Alarmet e ditës", body: "Ky është lista juaj e kontrollit ditor. 'Premtime pagese për sot' janë debitorët që thanë se do të paguanin sot — kontaktojini për konfirmim. 'Këste me vonesë' janë pagesat e rëna dakord që janë vonuar." },
        { title: "Tabela e performancës së oficerëve", body: "Tregon sa ka arkëtuar dhe sa aktivitete ka regjistruar çdo oficer këtë muaj. Përdoreni për të parë kush po arrin objektivat." },
      ]} />

      <div className="p-4 md:p-6 space-y-5">

        {/* First-run onboarding banner */}
        {!loading && stats && stats.activeCases === 0 && stats.totalOutstanding === 0 && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                <BarChart3 size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-semibold text-brand-900 mb-1">Mirësevini në Platformën DLR</h3>
                <p className="text-[13px] text-brand-700 mb-3">Filloni duke konfiguruar platformën tuaj. Ndiqni hapat më poshtë për të nisur gjurmimin e rikuperimit të borxheve.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { step: "1", label: "Shto Institucione", desc: "Regjistroni institucionet financiare kredidhënëse që menaxhoni.", href: "/institutions" },
                    { step: "2", label: "Konfiguro Zyret dhe Përdoruesit", desc: "Krijoni zyra dhe ftoni oficerët në platformë.", href: "/admin/reference" },
                    { step: "3", label: "Importo Dosjet e Kredive", desc: "Përdorni importin masiv në Raporte për të ngarkuar portofolio fillestar.", href: "/reports" },
                  ].map((s) => (
                    <button key={s.step} onClick={() => router.push(s.href)}
                      className="bg-white border border-brand-200 rounded-lg p-3.5 text-left hover:border-brand-400 hover:shadow-sm transition-all">
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center mb-2">{s.step}</div>
                      <div className="text-[12.5px] font-semibold text-gray-900 mb-0.5">{s.label}</div>
                      <div className="text-[11px] text-gray-500 leading-snug">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
          {loading || !stats ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 md:px-4 md:py-3 min-h-[62px] md:min-h-0 animate-pulse flex flex-col justify-between">
              <div className="h-2 w-16 bg-gray-100 rounded" />
              <div className="h-5 w-12 bg-gray-100 rounded" />
            </div>
          )) : [
            { label: "Gjendja Debitore", value: formatCurrency(stats.totalOutstanding), href: "/cases" },
            { label: "Arkëtime Këtë Muaj", value: formatCurrency(stats.collectionsThisMonth), href: "/payments" },
            { label: "Dosje Aktive", value: stats.activeCases.toLocaleString(), href: "/cases" },
            { label: "Marrëveshje Aktive", value: stats.activeAgreements.toLocaleString(), alert: stats.overdueInstallments > 0, href: "/agreements" },
            { label: "Premtime Pagese për Sot", value: stats.promisesToday.toLocaleString(), alert: stats.promisesToday > 0, href: "/cases?view=promises_today" },
            { label: "Dosje Juridike", value: stats.legalCases.toLocaleString(), href: "/legal" },
          ].map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* Chart + Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:items-stretch">
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">Arkëtime Mujore</h3>
                <p className="text-[12px] text-gray-400 mt-0.5">Para të arkëtuara — EUR</p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Këtë muaj</div>
                <div className="text-[18px] font-bold text-brand-700 tabular leading-tight">
                  {loading ? "—" : fmtVal(monthlyData[now.getMonth()]?.total ?? 0)}
                </div>
              </div>
            </div>
            <div className="px-3 pt-1 pb-3">
              {loading
                ? <div className="aspect-[5/3] animate-pulse bg-gray-100 rounded-lg" />
                : <CollectionsChart data={monthlyData} currentMonth={currentMonth} />}
            </div>
          </div>

          <div className="flex flex-col gap-4 h-full">
            <Card className="p-4 md:p-5">
              <CardHeader title="Alarmet e Ditës" />
              <div className="space-y-1.5">
                {loading || !stats ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-0.5">
                    <div className="w-6 h-6 rounded-md bg-gray-100 animate-pulse shrink-0" />
                    <div className="flex-1 h-3 bg-gray-100 animate-pulse rounded" />
                    <div className="w-6 h-3 bg-gray-100 animate-pulse rounded" />
                  </div>
                )) : [
                  { icon: CheckSquare,  label: "Premtime pagese për sot",  val: stats.promisesToday,       href: "/cases?view=promises_today" },
                  { icon: AlertCircle,  label: "Këste me vonesë",          val: stats.overdueInstallments, href: "/agreements" },
                  { icon: Scale,        label: "Dosje juridike",           val: stats.legalCases,          href: "/legal" },
                  { icon: FolderOpen,   label: "Dosje aktive",             val: stats.activeCases,         href: "/cases" },
                  { icon: FileCheck,    label: "Marrëveshje aktive",       val: stats.activeAgreements,    href: "/agreements" },
                ].map((a) => (
                  <button key={a.label} onClick={() => router.push(a.href)}
                    className="flex items-center gap-2.5 py-0.5 w-full hover:opacity-80 transition-opacity text-left">
                    <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                      <a.icon size={11} className="text-gray-500" />
                    </div>
                    <span className="flex-1 text-[12px] text-gray-600">{a.label}</span>
                    <span className="text-[13px] font-bold tabular text-gray-900">{a.val}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="flex-1 flex flex-col p-4 md:p-5">
              <CardHeader title="Sipas Zyrës" subtitle="Dosje aktive" />
              <div className="flex-1 space-y-2">
                {loading || !stats ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <div className="h-2.5 bg-gray-100 animate-pulse rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                    <div className="h-2.5 w-5 bg-gray-100 animate-pulse rounded" />
                  </div>
                )) :
                  (stats.officeStats ?? []).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-600">{o.name}</span>
                      <span className={`font-semibold tabular ${o.activeCases > 0 ? "text-gray-900" : "text-gray-300"}`}>{o.activeCases}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Officer performance this month */}
        {officers.length > 0 && (
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">Performanca e Oficerëve</h3>
                <p className="text-[12px] text-gray-400">{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
              </div>
              <button onClick={() => router.push("/performance")}
                className="text-[12px] text-brand-600 font-medium hover:underline transition-colors flex items-center gap-1">
                Raporti i plotë <ArrowUpRight size={12} />
              </button>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>Oficer</Th>
                  <Th>Zyrë</Th>
                  <Th>Dosje</Th>
                  <Th>Aktivitete</Th>
                  <Th>Arkëtuar</Th>
                </tr>
              </Thead>
              <Tbody>
                {officers.slice(0, 6).map((o: any) => (
                  <Tr key={o.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                          <span className="text-brand-700 text-[9px] font-bold">
                            {o.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[12.5px] font-medium text-gray-900">{o.fullName}</span>
                      </div>
                    </Td>
                    <Td><span className="text-[12px] text-gray-500">{o.office?.name ?? "—"}</span></Td>
                    <Td><span className="tabular text-[12.5px] font-semibold text-gray-900">{o.activeCases ?? 0}</span></Td>
                    <Td><span className="tabular text-[12.5px] text-gray-600">{o.totalActivities ?? 0}</span></Td>
                    <Td><span className="tabular text-[12.5px] font-semibold text-emerald-700">{formatCurrency(o.collectedAmount ?? 0)}</span></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}

        {/* Recent payments */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-gray-900">Pagesat e Fundit</h3>
              <p className="text-[12px] text-gray-400">5 transaksionet e fundit të regjistruara</p>
            </div>
            <button onClick={() => router.push("/payments")}
              className="text-[12px] text-brand-600 font-medium hover:underline transition-colors flex items-center gap-1">
              Shiko të gjitha <ArrowUpRight size={12} />
            </button>
          </div>
          {loading ? <div className="py-8 flex justify-center"><RefreshCw size={16} className="animate-spin text-gray-300" /></div>
            : recentPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-gray-400">Nuk ka pagesa të regjistruara akoma</div>
            ) : (
              <Table>
                <Thead><tr><Th>Referenca</Th><Th>Debitor</Th><Th>Shuma</Th><Th>Data</Th><Th>Oficer</Th></tr></Thead>
                <Tbody>
                  {recentPayments.map((p) => (
                    <Tr key={p.id} onClick={() => router.push(`/cases/${p.case?.id}`)}>
                      <Td><span className="font-mono text-[12px] text-gray-500">{p.paymentReference}</span></Td>
                      <Td>
                        <span className="font-medium text-gray-900">
                          {p.case?.loan?.borrower ? `${p.case.loan.borrower.fullName}` : "—"}
                        </span>
                      </Td>
                      <Td><span className="font-semibold text-emerald-700 tabular">{formatCurrency(Number(p.amount))}</span></Td>
                      <Td><span className="tabular text-gray-500">{new Date(p.paymentDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "long", year: "numeric" })}</span></Td>
                      <Td><span className="text-gray-500">{p.officer?.fullName ?? "—"}</span></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
        </Card>

      </div>
    </div>
  );
}

// ── VIEWER dashboard ──────────────────────────────────────────────────────────
function ViewerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  function load() {
    setLoading(true); setError(null);
    casesApi.dashboardStats()
      .then((s) => setStats(s))
      .catch((e: any) => setError(e.message ?? "Gabim i panjohur"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const allMonths2 = Array.from({ length: 12 }, (_, i) =>
    `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`
  );
  const apiMonthly: Record<string, number> = {};
  for (const m of (stats?.monthlyCollections ?? [])) apiMonthly[m.month] = m.total;
  const monthlyData = allMonths2.map((month) => ({ month, total: apiMonthly[month] ?? 0 }));
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (error) return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle={`Pasqyrë e portofolit · ${MONTHS[now.getMonth()]} ${now.getFullYear()}`} />
      <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
        Gabim gjatë ngarkimit të ballinës: {error}. <button onClick={load} className="underline ml-1">Riprovo</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle={`Pasqyrë e portofolit · ${MONTHS[now.getMonth()]} ${now.getFullYear()}`} help={[
        { title: "Niveli juaj i aksesit", body: "Keni akses vetëm për lexim — mund të shikoni gjithçka në platformë, por nuk mund të shtoni, ndryshoni apo fshini asnjë regjistrim. Kjo është projektuar për auditorët dhe drejtuesit që kanë nevojë të monitorojnë pa bërë ndryshime." },
        { title: "Shifrat kryesore", body: "Këto tregojnë gjendjen aktuale të portofolit — gjendja debitore totale, para të arkëtuara këtë muaj, dosjet e hapura dhe dosjet në procedim juridik. Klikoni çdo shifër për të parë listën e plotë pas saj." },
      ]} />
      <div className="p-4 md:p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
          {loading || !stats ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 md:px-4 md:py-3 min-h-[62px] md:min-h-0 animate-pulse flex flex-col justify-between">
              <div className="h-2 w-16 bg-gray-100 rounded" /><div className="h-5 w-12 bg-gray-100 rounded" />
            </div>
          )) : [
            { label: "Gjendja Debitore",        value: formatCurrency(stats.totalOutstanding),    sub: "Për të gjitha institucionet" },
            { label: "Arkëtime Këtë Muaj",       value: formatCurrency(stats.collectionsThisMonth),sub: "Muaji aktual" },
            { label: "Dosje Aktive",             value: stats.activeCases.toLocaleString(),        sub: "Aktualisht aktive",          href: "/cases" },
            { label: "Marrëveshje Aktive",       value: stats.activeAgreements.toLocaleString(),   sub: `${stats.overdueInstallments} me vonesë`, alert: stats.overdueInstallments > 0, href: "/agreements" },
            { label: "Premtime Pagese për Sot",  value: stats.promisesToday.toLocaleString(),      sub: "Kërkon ndjekje", alert: stats.promisesToday > 0, href: "/cases?view=promises_today" },
            { label: "Dosje Juridike",           value: stats.legalCases.toLocaleString(),         sub: "Në procedim",                href: "/legal" },
          ].map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch">
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">Arkëtime Mujore</h3>
                <p className="text-[12px] text-gray-400 mt-0.5">Para të arkëtuara — EUR</p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Këtë muaj</div>
                <div className="text-[18px] font-bold text-brand-700 tabular leading-tight">
                  {loading ? "—" : fmtVal(monthlyData[now.getMonth()]?.total ?? 0)}
                </div>
              </div>
            </div>
            <div className="px-3 pt-1 pb-3">
              {loading
                ? <div className="aspect-[5/3] animate-pulse bg-gray-100 rounded-lg" />
                : <CollectionsChart data={monthlyData} currentMonth={currentMonth} />}
            </div>
          </div>
          <div className="flex flex-col gap-4 h-full">
            <Card className="flex-1 flex flex-col p-4 md:p-5">
              <CardHeader title="Sipas Zyrës" subtitle="Dosje aktive" />
              <div className="flex-1 space-y-2">
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <div className="h-2.5 bg-gray-100 animate-pulse rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                    <div className="h-2.5 w-5 bg-gray-100 animate-pulse rounded" />
                  </div>
                )) :
                  (stats?.officeStats ?? []).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-600">{o.name}</span>
                      <span className={`font-semibold tabular ${o.activeCases > 0 ? "text-gray-900" : "text-gray-300"}`}>{o.activeCases}</span>
                    </div>
                  ))}
              </div>
            </Card>
            <Card>
              <h3 className="text-[12px] font-semibold text-gray-700 mb-3 uppercase tracking-wide">Shfleto</h3>
              <div className="space-y-1">
                {[
                  { label: "Dosjet", href: "/cases", icon: FolderOpen },
                  { label: "Raporte", href: "/reports", icon: BarChart3 },
                  { label: "Performanca", href: "/performance", icon: TrendingUp },
                  { label: "Procedime juridike", href: "/legal", icon: Scale },
                ].map((l) => (
                  <button key={l.href} onClick={() => router.push(l.href)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <l.icon size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[12.5px] text-gray-700">{l.label}</span>
                    <ChevronRight size={12} className="text-gray-300 ml-auto" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root: route to correct dashboard ─────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex flex-col">
      <Topbar title="Ballina" subtitle="Duke ngarkuar…" />
      <Spinner />
    </div>
  );

  const role = user?.role ?? "VIEWER";

  if (role === "OFFICER") return <OfficerDashboard user={user} />;
  if (role === "ADMIN")   return <ManagerDashboard user={user} isAdmin />;
  if (role === "MANAGER") return <ManagerDashboard user={user} isAdmin={false} />;
  return <ViewerDashboard />;
}
