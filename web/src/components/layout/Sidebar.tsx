"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Permission } from "@/lib/permissions";
import {
  LayoutDashboard, FolderOpen, Activity,
  CreditCard, FileText, Scale, Building2,
  BarChart3, TrendingUp, Users, Database, Settings,
  ChevronDown, LogOut, Menu, X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  badgeKey?: string;
  permission: Permission;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

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
    label: "Administrim",
    items: [
      { href: "/admin/users",     label: "Përdoruesit", icon: Users,    permission: "page:admin:users" },
      { href: "/admin/reference", label: "Zyret",       icon: Database, permission: "page:admin:offices" },
    ],
  },
];


function NavItem({ item, active, badge, onClick }: { item: any; active: boolean; badge: number | null; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors group",
        active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      )}
    >
      <item.icon size={15} className={cn(active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600")} />
      <span className="flex-1">{item.label}</span>
      {badge != null && (
        <span className="text-[10px] font-semibold bg-brand-100 text-brand-700 rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, can, loading: authLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const scopedToSelf = user?.role === "OFFICER";

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Listen for open-nav-drawer event from Topbar mobile hamburger
  useEffect(() => {
    const handler = () => setDrawerOpen(true);
    window.addEventListener("open-nav-drawer", handler);
    return () => window.removeEventListener("open-nav-drawer", handler);
  }, []);

  function logout() {
    auth.logout().catch(() => {}).finally(() => {
      localStorage.removeItem("dlr_user");
      router.push("/login");
    });
  }

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "—";

  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {nav.map((group) => {
          const visibleItems = group.items.filter((item) => can(item.permission));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-1">
                {group.label}
              </div>
              {visibleItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const badge = null;
                return (
                  <NavItem key={item.href} item={item} active={active} badge={badge} onClick={onItemClick} />
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-3 py-3 relative">
        {authLoading ? (
          <div className="flex items-center gap-2.5 px-2 py-2 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-24 bg-gray-100 rounded" />
              <div className="h-2 w-14 bg-gray-100 rounded" />
            </div>
          </div>
        ) : (
        <button
          onClick={() => setShowUserMenu((o) => !o)}
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md hover:bg-gray-50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-brand-700 text-[11px] font-semibold">{initials}</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[12px] font-medium text-gray-900 leading-none truncate">{user?.fullName}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{({ ADMIN: "Administrator", MANAGER: "Menaxher", OFFICER: "Oficer", VIEWER: "Vëzhgues" } as any)[user?.role ?? ""] ?? user?.role ?? ""}</div>
          </div>
          <ChevronDown size={12} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
        </button>
        )}

        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-[12px] font-medium text-gray-900">{user?.fullName}</div>
              <div className="text-[11px] text-gray-400">{user?.email ?? user?.username}</div>
            </div>
            {can("page:settings") && (
              <Link href="/admin/system" onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                <Settings size={13} /> Cilësimet e Llogarisë
              </Link>
            )}
            <button onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={13} /> Dilni
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="flex items-center px-5 py-3 border-b border-gray-100">
          <img src="/logo.png" alt="DLR" className="h-9 w-auto" />
        </div>
        <NavContent />
      </aside>

      {/* ── Mobile: slide-in drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <img src="/logo.png" alt="DLR" className="h-9 w-auto" />
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>
            <NavContent onItemClick={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Mobile bottom nav is rendered in layout.tsx outside overflow containers */}
    </>
  );
}
