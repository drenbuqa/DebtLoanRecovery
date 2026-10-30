"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Permission } from "@/lib/permissions";
import {
  LayoutDashboard, FolderOpen, Activity,
  CreditCard, FileText, Scale, Building2,
  BarChart3, TrendingUp, Users, Database, Settings,
  LogOut, X, Upload, CalendarDays, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

// ── Nav config ─────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: any; permission: Permission };
type NavGroup = { label: string; items: NavItem[] };

const nav: NavGroup[] = [
  {
    label: "Pasqyrë",
    items: [
      { href: "/dashboard",    label: "Ballina",      icon: LayoutDashboard, permission: "page:dashboard" },
    ],
  },
  {
    label: "Operacione",
    items: [
      { href: "/cases",        label: "Klientët",      icon: FolderOpen,   permission: "page:cases" },
      { href: "/activities",   label: "Aktivitetet",   icon: Activity,     permission: "page:activities" },
      { href: "/payments",     label: "Pagesat",       icon: CreditCard,   permission: "page:payments" },
      { href: "/agreements",   label: "Marrëveshjet",  icon: FileText,     permission: "page:agreements" },
      { href: "/legal",        label: "Juridike",      icon: Scale,        permission: "page:legal" },
    ],
  },
  {
    label: "Portofol",
    items: [
      { href: "/institutions", label: "Institucione",  icon: Building2,    permission: "page:institutions" },
    ],
  },
  {
    label: "Raportim",
    items: [
      { href: "/reports",      label: "Raporte",       icon: BarChart3,    permission: "page:reports" },
      { href: "/performance",  label: "Performanca",   icon: TrendingUp,   permission: "page:performance" },
    ],
  },
  {
    label: "HR",
    items: [
      { href: "/leave", label: "Pushimet", icon: CalendarDays, permission: "page:leave" },
    ],
  },
  {
    label: "Administrim",
    items: [
      { href: "/admin/users",     label: "Përdoruesit", icon: Users,    permission: "page:admin:users" },
      { href: "/admin/reference", label: "Zyret",       icon: Database, permission: "page:admin:offices" },
      { href: "/import",          label: "Import",      icon: Upload,   permission: "page:import" },
    ],
  },
];

// ── Tooltip wrapper (for collapsed icons) ──────────────────────

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="fixed z-[200] pointer-events-none"
          style={{
            left: (ref.current?.getBoundingClientRect().right ?? 0) + 8,
            top: (ref.current?.getBoundingClientRect().top ?? 0) + (ref.current?.offsetHeight ?? 0) / 2,
            transform: "translateY(-50%)",
          }}>
          <div className="px-2.5 py-1.5 bg-gray-900 text-white text-[12px] font-medium rounded-lg shadow-lg whitespace-nowrap">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav item ───────────────────────────────────────────────────

function NavItemEl({
  item, active, badge, collapsed, onClick,
}: {
  item: NavItem; active: boolean; badge: number | null; collapsed: boolean; onClick?: () => void;
}) {
  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-lg text-[13px] font-medium transition-colors group overflow-hidden",
        collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-2.5 px-2.5 py-2 w-full",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      )}
    >
      <item.icon
        size={16}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600"
        )}
      />
      {/* Label — fades out when collapsing */}
      <span
        className="flex-1 whitespace-nowrap leading-none transition-[opacity,max-width] duration-200"
        style={{
          opacity: collapsed ? 0 : 1,
          maxWidth: collapsed ? 0 : 160,
          overflow: "hidden",
        }}
      >
        {item.label}
      </span>
      {/* Badge */}
      {!collapsed && badge != null && (
        <span className="text-[10px] font-semibold bg-brand-100 text-brand-700 rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return <Tooltip label={item.label}>{content}</Tooltip>;
  }
  return content;
}

// ── Nav content ────────────────────────────────────────────────

function NavContent({
  collapsed, onItemClick,
}: {
  collapsed: boolean; onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, can, loading: authLoading } = useAuth();

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "—";

  const roleLabel = ({ ADMIN: "Administrator", MANAGER: "Menaxher", OFFICER: "Oficer", VIEWER: "Vëzhgues" } as any)[user?.role ?? ""] ?? user?.role ?? "";

  function logout() {
    auth.logout().catch(() => {}).finally(() => {
      localStorage.removeItem("dlr_user");
      router.push("/login");
    });
  }

  return (
    <>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        {nav.map((group) => {
          const visibleItems = group.items.filter((item) => can(item.permission));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className={cn("mb-3", collapsed ? "mb-1" : "mb-4")}>
              {/* Group label */}
              <div
                className="px-2 mb-1 overflow-hidden transition-[opacity,max-height] duration-200"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxHeight: collapsed ? 0 : 24,
                  marginBottom: collapsed ? 0 : undefined,
                }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                  {group.label}
                </span>
              </div>
              {visibleItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <NavItemEl
                    key={item.href}
                    item={item}
                    active={active}
                    badge={null}
                    collapsed={collapsed}
                    onClick={onItemClick}
                  />
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-0.5 overflow-hidden">
        {authLoading ? (
          <div className="flex items-center gap-2.5 px-2 py-2 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
            {!collapsed && (
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-24 bg-gray-100 rounded" />
                <div className="h-2 w-14 bg-gray-100 rounded" />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* User identity */}
            {collapsed ? (
              <Tooltip label={`${user?.fullName ?? ""} · ${roleLabel}`}>
                <div className="flex justify-center py-1.5">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-brand-700 text-[11px] font-semibold">{initials}</span>
                  </div>
                </div>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2.5 px-2 py-2">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-brand-700 text-[11px] font-semibold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-gray-900 leading-none truncate">{user?.fullName}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{roleLabel}</div>
                </div>
              </div>
            )}

            {/* Settings */}
            {can("page:settings") && (
              collapsed ? (
                <Tooltip label="Cilësimet">
                  <Link href="/admin/system"
                    className="flex justify-center items-center w-10 h-10 mx-auto rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <Settings size={15} />
                  </Link>
                </Tooltip>
              ) : (
                <Link href="/admin/system"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors group">
                  <Settings size={15} className="text-gray-400 group-hover:text-gray-600 shrink-0" />
                  <span className="truncate">Cilësimet</span>
                </Link>
              )
            )}

            {/* Logout */}
            {collapsed ? (
              <Tooltip label="Dilni">
                <button onClick={logout}
                  className="flex justify-center items-center w-10 h-10 mx-auto rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut size={15} />
                </button>
              </Tooltip>
            ) : (
              <button onClick={logout}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors group">
                <LogOut size={15} className="text-red-400 group-hover:text-red-600 shrink-0" />
                <span className="truncate">Dilni</span>
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Sidebar ────────────────────────────────────────────────────

const COLLAPSED_KEY = "dlr_sidebar_collapsed";
const EXPANDED_W   = 220;
const COLLAPSED_W  = 64;

export default function Sidebar() {
  const pathname = usePathname();
  const { } = useAuth(); // ensure auth context loaded

  const [collapsed, setCollapsed]     = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [hydrated, setHydrated]       = useState(false);

  // Restore persisted state after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "true") setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch {}
  }, [collapsed, hydrated]);

  // Close mobile drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Listen for mobile hamburger
  useEffect(() => {
    const handler = () => setDrawerOpen(true);
    window.addEventListener("open-nav-drawer", handler);
    return () => window.removeEventListener("open-nav-drawer", handler);
  }, []);

  function toggle() { setCollapsed(c => !c); }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-hidden"
        style={{
          width: hydrated ? (collapsed ? COLLAPSED_W : EXPANDED_W) : EXPANDED_W,
          transition: hydrated ? "width 280ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
      >
        {/* Logo + collapse toggle */}
        <div className="flex items-center border-b border-gray-100 shrink-0 overflow-hidden"
          style={{
            height: 56,
            padding: collapsed ? "0 0 0 0" : "0 12px 0 20px",
            transition: "padding 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            justifyContent: collapsed ? "center" : "space-between",
          }}>
          {/* Logo */}
          <div className="overflow-hidden transition-[opacity,max-width] duration-200"
            style={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 160 }}>
            <img src="/logo.png" alt="DLR" className="h-11 w-auto" style={{ minWidth: 80 }} />
          </div>

          {/* Collapse toggle */}
          <button
            onClick={toggle}
            className={cn(
              "flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0",
              collapsed ? "w-10 h-10" : "w-8 h-8"
            )}
            title={collapsed ? "Hap menunë" : "Mbyll menunë"}
          >
            {collapsed
              ? <PanelLeftOpen size={16} />
              : <PanelLeftClose size={16} />}
          </button>
        </div>

        <NavContent collapsed={collapsed} />
      </aside>

      {/* ── Mobile: slide-in drawer ──────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 bg-white flex flex-col shadow-2xl"
            style={{ width: 260 }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <img src="/logo.png" alt="DLR" className="h-11 w-auto" />
              <button onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <NavContent collapsed={false} onItemClick={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
