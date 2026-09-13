"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderOpen, Activity, Grid3X3 } from "lucide-react";

const tabs = [
  { href: "/dashboard",  label: "Ballina",    icon: LayoutDashboard },
  { href: "/activities", label: "Aktivitete", icon: Activity },
  { href: "/cases",      label: "Klientët",   icon: FolderOpen },
  { href: "/more",       label: "Më shumë",   icon: Grid3X3 },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 items-end"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
          (item.href === "/cases" && pathname === "/cases");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 relative transition-colors",
              active ? "text-brand-600" : "text-gray-400"
            )}
          >
            <item.icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span className={cn("text-[10px] font-medium", active ? "text-brand-600" : "text-gray-400")}>
              {item.label}
            </span>
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-500 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
