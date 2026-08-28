"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";

function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useKeyboardShortcuts();
  return (
    <div key={pathname} className="animate-page-in h-full">
      {children}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {/* Main layout — overflow-hidden clips scroll, but must NOT contain the mobile nav */}
        <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto mobile-nav-pad md:pb-0">
              <PageWrapper>{children}</PageWrapper>
            </main>
          </div>
        </div>
        {/* Mobile bottom nav lives OUTSIDE the overflow-hidden container so Safari doesn't clip it */}
        <MobileNav />
      </ToastProvider>
    </AuthProvider>
  );
}
