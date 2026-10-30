"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, HelpCircle, X, FolderOpen, AlertCircle, CheckSquare, Scale, ChevronRight, CalendarDays } from "lucide-react";
import { cases as casesApi, notifications as notificationsApi } from "@/lib/api";
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
function NotifDot() {
  return <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />;
}

function NotificationsPanel() {
  const [open, setOpen]               = useState(false);
  const [alerts, setAlerts]           = useState<any>(null);
  const [notifs, setNotifs]           = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [alertsNew, setAlertsNew]     = useState(false);
  const ref                           = useRef<HTMLDivElement>(null);
  const router                        = useRouter();
  const { user, scopedToSelf }        = useAuth();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Poll unread count every 60 s so badge stays fresh
  useEffect(() => {
    if (!user) return;
    function fetchCount() {
      notificationsApi.unreadCount().then(r => setUnreadCount(r.count ?? 0)).catch(() => {});
    }
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [user]);

  async function loadPanel() {
    if (!user) return;
    const promises: Promise<any>[] = [notificationsApi.list().catch(() => [])];
    if (!scopedToSelf) promises.push(casesApi.dashboardStats().catch(() => null));
    const [ns, stats] = await Promise.all(promises);
    setNotifs(ns ?? []);
    if (stats !== undefined) setAlerts(stats);
  }

  async function toggle() {
    if (open) { setOpen(false); return; }

    // Business alerts are "new" if the panel hasn't been opened today
    try {
      const today = new Date().toDateString();
      const lastSeen = localStorage.getItem("notif_panel_date");
      setAlertsNew(lastSeen !== today);
      localStorage.setItem("notif_panel_date", today);
    } catch {}

    setOpen(true);
    setLoading(true);
    await loadPanel().catch(() => {});
    setLoading(false);

    // Mark all as read on the server and clear the badge, but keep local readAt
    // so items remain visually "unread" for this session
    notificationsApi.markAllRead().catch(() => {});
    setUnreadCount(0);
  }

  function goAndClose(path: string, notifId?: string) {
    if (notifId) notificationsApi.markRead(notifId).catch(() => {});
    router.push(path);
    setOpen(false);
  }

  const hasBusinessAlerts = !scopedToSelf && alerts && (
    alerts.promisesToday > 0 || alerts.overdueInstallments > 0 || alerts.legalCases > 0
  );

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-900">Njoftimet</span>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-[12px] text-gray-400 text-center">Duke ngarkuar…</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">

              {/* Personal notifications — unread items get a blue dot + subtle bg */}
              {notifs.slice(0, 10).map(n => {
                const unread = !n.readAt;
                const link = n.link ?? "/";
                const Icon = link.startsWith("/cases") ? FolderOpen
                           : link.startsWith("/legal") ? Scale
                           : CalendarDays;
                return (
                  <button key={n.id} onClick={() => goAndClose(link, n.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${unread ? "bg-blue-50/40" : ""}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${unread ? "bg-brand-100" : "bg-brand-50"}`}>
                      <Icon size={13} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] truncate ${unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                        {n.title}
                      </div>
                      {n.body && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{n.body}</div>}
                      <div className="text-[10px] text-gray-300 mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString("sq-AL")}
                      </div>
                    </div>
                    {unread && <NotifDot />}
                  </button>
                );
              })}

              {/* Business alerts — shown as "new" if first panel open today */}
              {!scopedToSelf && alerts?.overdueInstallments > 0 && (
                <button onClick={() => goAndClose("/agreements")}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${alertsNew ? "bg-blue-50/40" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${alertsNew ? "bg-red-100" : "bg-red-50"}`}>
                    <AlertCircle size={13} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className={`text-[13px] ${alertsNew ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {alerts.overdueInstallments} këst{alerts.overdueInstallments !== 1 ? "e" : ""} me vonesë
                    </div>
                    <div className="text-[11px] text-gray-400">Kërkon ndjekje të menjëhershme</div>
                  </div>
                  {alertsNew && <NotifDot />}
                </button>
              )}

              {!scopedToSelf && alerts?.promisesToday > 0 && (
                <button onClick={() => goAndClose("/cases?view=promises_today")}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${alertsNew ? "bg-blue-50/40" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${alertsNew ? "bg-amber-100" : "bg-amber-50"}`}>
                    <CheckSquare size={13} className="text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className={`text-[13px] ${alertsNew ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {alerts.promisesToday} premtim{alerts.promisesToday !== 1 ? "e" : ""} pagese për sot
                    </div>
                    <div className="text-[11px] text-gray-400">Ndiqni angazhimet e pagesave</div>
                  </div>
                  {alertsNew && <NotifDot />}
                </button>
              )}

              {!scopedToSelf && alerts?.legalCases > 0 && (
                <button onClick={() => goAndClose("/legal")}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${alertsNew ? "bg-blue-50/40" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${alertsNew ? "bg-brand-100" : "bg-brand-50"}`}>
                    <Scale size={13} className="text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <div className={`text-[13px] ${alertsNew ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {alerts.legalCases} klient juridike aktive
                    </div>
                    <div className="text-[11px] text-gray-400">Procedime që kërkojnë vëmendje</div>
                  </div>
                  {alertsNew && <NotifDot />}
                </button>
              )}

              {notifs.length === 0 && !hasBusinessAlerts && (
                <div className="px-4 py-8 text-center">
                  <div className="text-[13px] font-medium text-gray-700 mb-1">Gjithçka në rregull</div>
                  <div className="text-[12px] text-gray-400">Nuk ka njoftime të reja.</div>
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
  { title: "Si të gjeni një klient shpejt", body: "Klikoni shiritin e kërkimit në krye (ose shtypni / në tastierë) dhe filloni të shkruani emrin e debitorit, numrin personal ose referencën. Rezultatet shfaqen menjëherë — klikoni mbi klientin për të hapur faqen e plotë." },
  { title: "Si të lëvizni midis seksioneve", body: "Përdorni menunë anësore në të majtë (ose menunë e poshtme nëse jeni në celular). Çdo seksion ka funksionin e vet: Klientë për portofolinë, Aktivitete për regjistrimin e kontakteve, Pagesa për arkëtimet, Marrëveshje për planet e ripagimit." },
  { title: "Si të regjistroni punën tuaj ditore", body: "Pas çdo kontakti me debitorin, shkoni te klienti dhe klikoni 'Regjistro Aktivitet' — zgjidhni llojin (telefonatë, vizitë), rezultatin dhe nëse klienti dha premtim pagese. Kjo mban gjurmë të punës suaj dhe njofton ekipin." },
  { title: "Njoftimet — çfarë do të thotë?", body: "Ikona e ziles në krye tregon njoftimet tuaja. Njoftoheni kur: caktohet një klient i ri tek ju, një premtim pagese kalon datën pa pagesë, ose një marrëveshje thyhet. Klikoni njoftimin për të shkuar direkt te klienti." },
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
            <button onClick={() => setOpen(false)} className="modal-close-btn"><X size={14} /></button>
          </div>
          <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto">
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
    ANKES: "bg-purple-100 text-purple-700",
    AKTGJYKIM: "bg-blue-100 text-blue-700",
  };
  const statusLabel: Record<string, string> = {
    ACTIVE: "Aktiv", SUSPENDED: "Pezulluar", CLOSED: "Mbyllur",
    LEGAL: "Juridike", ANKES: "Ankesë", AKTGJYKIM: "Aktgjykim",
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
