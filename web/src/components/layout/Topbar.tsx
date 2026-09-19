"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, HelpCircle, X, FolderOpen, AlertCircle, CheckSquare, Scale, ChevronRight } from "lucide-react";
import { cases as casesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────
export interface HelpItem {
  title: string;
  body: string;
}

interface TopbarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  help?: HelpItem[];
}

// ── Global search ────────────────────────────────────────────
function GlobalSearch() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);
  const timer                 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router                = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await casesApi.list({ search: query.trim(), limit: 7 });
        setResults(res.data ?? []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  function go(id: string) {
    router.push(`/cases/${id}`);
    setQuery(""); setResults([]); setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setQuery(""); setOpen(false); }
    if (e.key === "Enter" && results.length === 1) go(results[0].id);
  }

  return (
    <div ref={ref} className="relative w-64">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKey}
        placeholder="Kërko klient, debitorë…"
        data-global-search
        className="w-full h-8 pl-8 pr-8 bg-gray-50 border border-gray-200 rounded-md text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 transition"
      />
      {query && (
        <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={12} />
        </button>
      )}

      {open && (
        <div className="absolute top-full mt-1.5 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-[12px] text-gray-400">Duke kërkuar…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-gray-400">Nuk u gjet asgjë për "<strong>{query}</strong>"</div>
          ) : (
            <>
              <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Klientët</div>
              {results.map((c) => {
                const borrower = c.loan?.borrower;
                const name = borrower ? `${borrower.fullName}` : "—";
                return (
                  <button key={c.id} onClick={() => go(c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                    <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                      <FolderOpen size={12} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 truncate">{name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{c.caseReference}</div>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                      c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "LEGAL"  ? "bg-brand-100 text-brand-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>{c.status}</span>
                  </button>
                );
              })}
              {results.length === 7 && (
                <button onClick={() => { router.push(`/cases?search=${encodeURIComponent(query)}`); setOpen(false); }}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2.5 text-[12px] text-brand-600 hover:bg-brand-50 border-t border-gray-100 font-medium transition-colors">
                  Shiko të gjitha rezultatet <ChevronRight size={12} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Notifications ────────────────────────────────────────────
function NotificationsPanel() {
  const [open, setOpen]     = useState(false);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);
  const router              = useRouter();
  const { user, scopedToSelf } = useAuth();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function loadAlerts() {
    if (!user || scopedToSelf) return;
    try {
      const stats = await casesApi.dashboardStats();
      setAlerts(stats);
    } catch {}
  }

  useEffect(() => { loadAlerts(); }, [user, scopedToSelf]);

  async function fetchAlerts() {
    setLoading(true);
    try { await loadAlerts(); }
    finally { setLoading(false); }
  }

  function toggle() {
    if (!open) fetchAlerts();
    setOpen((o) => !o);
  }

  const hasAlerts = !scopedToSelf && alerts && (
    alerts.promisesToday > 0 || alerts.overdueInstallments > 0 || alerts.legalCases > 0
  );

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <Bell size={18} />
        {hasAlerts && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-600 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-900">Njoftimet</span>
            <span className="text-[11px] text-gray-400">Sot</span>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-[12px] text-gray-400 text-center">Duke ngarkuar…</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {scopedToSelf && (
                <div className="px-4 py-8 text-center">
                  <div className="text-[13px] font-medium text-gray-700 mb-1">Gjithçka në rregull</div>
                  <div className="text-[12px] text-gray-400">Nuk ka njoftime për sot.</div>
                </div>
              )}

              {!scopedToSelf && alerts?.overdueInstallments > 0 && (
                <button onClick={() => { router.push("/agreements"); setOpen(false); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle size={13} className="text-red-500" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-gray-900">
                      {alerts.overdueInstallments} këst{alerts.overdueInstallments !== 1 ? "e" : ""} me vonesë
                    </div>
                    <div className="text-[11px] text-gray-400">Kërkon ndjekje të menjëhershme</div>
                  </div>
                </button>
              )}

              {!scopedToSelf && alerts?.promisesToday > 0 && (
                <button onClick={() => { router.push("/cases?view=promises_today"); setOpen(false); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckSquare size={13} className="text-amber-500" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-gray-900">
                      {alerts.promisesToday} premtim{alerts.promisesToday !== 1 ? "e" : ""} pagese për sot
                    </div>
                    <div className="text-[11px] text-gray-400">Ndiqni angazhimet e pagesave</div>
                  </div>
                </button>
              )}

              {!scopedToSelf && alerts?.legalCases > 0 && (
                <button onClick={() => { router.push("/legal"); setOpen(false); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Scale size={13} className="text-brand-600" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-gray-900">
                      {alerts.legalCases} klient juridike aktive
                    </div>
                    <div className="text-[11px] text-gray-400">Procedime që kërkojnë vëmendje</div>
                  </div>
                </button>
              )}

              {!scopedToSelf && !loading && !hasAlerts && alerts && (
                <div className="px-4 py-8 text-center">
                  <div className="text-[13px] font-medium text-gray-700 mb-1">Gjithçka në rregull</div>
                  <div className="text-[12px] text-gray-400">Nuk ka njoftime për sot.</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Help panel ───────────────────────────────────────────────
const DEFAULT_HELP: HelpItem[] = [
  { title: "Si të lëvizni në platformë", body: "Përdorni menunë në të majtë për të kaluar ndërmjet seksioneve. Nëse jeni me telefon ose tablet, shtypni ikonën e menusë në krye për ta hapur atë." },
  { title: "Si të gjeni një debitor ose klient", body: "Shkruani emrin e debitorit, numrin personal ose numrin e klientit në shiritin e kërkimit në krye. Rezultatet shfaqen menjëherë ndërsa shkruani — klikoni mbi të dhënën për të hapur klientin." },
  { title: "Navigim i shpejtë", body: "Shtypni / në tastierë për të kaluar direkt te shiriti i kërkimit. Përdorni g pastaj d për Ballinën, c për Klientët, a për Aktivitetet, ose b për t'u kthyer mbrapa." },
  { title: "Nuk dini çfarë të bëni?", body: "Pyesni menaxherin tuaj ose administratorin e sistemit. Mund të klikoni gjithashtu butonin ? në çdo faqe për të parë udhëzime specifike për atë seksion." },
];

function HelpPanel({ items }: { items: HelpItem[] }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <HelpCircle size={18} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-900">Ndihmë — Si të përdorni këtë faqe</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {items.map((item, i) => (
              <div key={i}>
                <div className="text-[12px] font-semibold text-gray-800 mb-1">{item.title}</div>
                <div className="text-[12px] text-gray-500 leading-relaxed">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile search overlay ────────────────────────────────────
function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);
  const timer                 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router                = useRouter();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await casesApi.list({ search: query.trim(), limit: 7 });
        setResults(res.data ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  function go(id: string) { router.push(`/cases/${id}`); onClose(); }

  const stageColor: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    SUSPENDED: "bg-amber-100 text-amber-700",
    LEGAL: "bg-brand-100 text-brand-700",
    CLOSED: "bg-gray-100 text-gray-500",
    WRITTEN_OFF: "bg-red-100 text-red-600",
  };
  const statusLabel: Record<string, string> = {
    ACTIVE: "Aktiv", SUSPENDED: "Pezulluar", CLOSED: "Mbyllur",
    LEGAL: "Juridike", WRITTEN_OFF: "I Shlyer",
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center gap-3 px-4 h-14 shrink-0">
          <div className="flex-1 flex items-center gap-2.5 bg-gray-100 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko klient, debitorë, kredi…"
              className="flex-1 text-[15px] text-gray-900 placeholder:text-gray-400 bg-transparent outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-400 active:text-gray-600 shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-brand-600 font-semibold text-[14px] shrink-0 px-1">
            Anulo
          </button>
        </div>
        <div className="h-px bg-gray-100" />
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-gray-100 rounded" />
                    <div className="h-2.5 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : query && results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Search size={18} className="text-gray-400" />
              </div>
              <div className="text-[14px] font-medium text-gray-600">Nuk u gjet asgjë</div>
              <div className="text-[12px] text-gray-400 mt-1">Provoni me fjalë të tjera</div>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="px-4 pt-4 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Klientët</div>
              {results.map((c) => {
                const borrower = c.loan?.borrower;
                const name = borrower ? `${borrower.fullName}` : "—";
                const initials = name !== "—"
                  ? name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                  : "?";
                return (
                  <button key={c.id} onClick={() => go(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left active:bg-brand-50 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
                      <span className="text-brand-600 text-[12px] font-bold">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-gray-900 truncate">{name}</div>
                      <div className="text-[12px] text-gray-400 font-mono mt-0.5">{c.caseReference}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase shrink-0 ${stageColor[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </button>
                );
              })}
              {results.length === 7 && (
                <button onClick={() => { router.push(`/cases?search=${encodeURIComponent(query)}`); onClose(); }}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-4 text-[13px] text-brand-600 font-semibold active:bg-brand-50">
                  Shiko të gjitha rezultatet <ChevronRight size={14} />
                </button>
              )}
            </>
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Search size={18} className="text-gray-400" />
              </div>
              <div className="text-[14px] font-medium text-gray-600">Kërko klient</div>
              <div className="text-[12px] text-gray-400 mt-1 leading-relaxed">
                Shkruani emrin e debitorit,<br />numrin e klientit ose kredisë
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}

// ── Topbar ───────────────────────────────────────────────────
export default function Topbar({ title, subtitle, children, help }: TopbarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      {mobileSearchOpen && <MobileSearchOverlay onClose={() => setMobileSearchOpen(false)} />}

      {/* ── Desktop topbar ── */}
      <header className="hidden md:flex h-14 bg-white border-b border-gray-200 items-center px-6 gap-4 sticky top-0 z-20">
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900 leading-none truncate">{title}</h1>
          {subtitle && <p className="text-[12px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        <GlobalSearch />
        <div className="flex items-center gap-1 shrink-0">
          <NotificationsPanel />
          <HelpPanel items={help ?? DEFAULT_HELP} />
        </div>
      </header>

      {/* ── Mobile topbar ── */}
      <header className="md:hidden flex h-14 bg-white border-b border-gray-200 items-center px-4 gap-2 sticky top-0 z-30">
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900 leading-none truncate">{title}</h1>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-1.5 shrink-0">{children}</div>}
        <button onClick={() => setMobileSearchOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-100 transition-colors shrink-0">
          <Search size={18} />
        </button>
        <NotificationsPanel />
        <HelpPanel items={help ?? DEFAULT_HELP} />
      </header>
    </>
  );
}
