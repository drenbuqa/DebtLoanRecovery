"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";

function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useKeyboardShortcuts();
  return (
    <div key={pathname} className="animate-page-in min-h-full">
      {children}
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F4F5F7]">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto mobile-nav-pad md:pb-0">
            <PageWrapper>{children}</PageWrapper>
          </main>
        </div>
      </div>
      <MobileNav />
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </ToastProvider>
    </AuthProvider>
  );
}
