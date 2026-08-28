"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { setToken } from "@/lib/api";
import {
  CreditCard, FileText,
  Scale, Building2, BarChart3, TrendingUp, Users,
  Database, ChevronRight, LogOut,
} from "lucide-react";

interface NavRowProps {
  href: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  sub?: string;
}

function NavRow({ href, icon: Icon, iconBg, iconColor, label, sub }: NavRowProps) {
  return (
    <Link href={href}
      className="flex items-center gap-3 px-4 py-3.5 bg-white border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={17} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-gray-900">{label}</div>
        {sub && <div className="text-[12px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
      <ChevronRight size={15} className="text-gray-300 shrink-0" />
    </Link>
  );
}

export default function MorePage() {
  const { user, can } = useAuth();
  const router = useRouter();

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "—";

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    MANAGER: "Menaxher",
    OFFICER: "Oficer",
    VIEWER: "Vëzhgues",
  };

  function logout() {
    setToken(null);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] pb-28">
      {/* Page title */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center px-4 h-14">
          <h1 className="text-[15px] font-semibold text-gray-900 flex-1">Më shumë</h1>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-brand-700 text-[15px] font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-gray-900 truncate">{user?.fullName}</div>
            <div className="text-[12px] text-gray-400 mt-0.5">
              {roleLabel[user?.role ?? ""] ?? user?.role} · {user?.office?.name ?? "—"}
            </div>
          </div>
        </div>

        {/* Operations */}
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Operacione</div>
          <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {can("page:payments")    && <NavRow href="/payments"    icon={CreditCard}  iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Pagesat"          sub="Regjistri i arkëtimeve" />}
            {can("page:agreements")  && <NavRow href="/agreements"  icon={FileText}    iconBg="bg-blue-50"    iconColor="text-blue-600"    label="Marrëveshjet"     sub="Planet e pagesave" />}
            {can("page:legal")       && <NavRow href="/legal"       icon={Scale}       iconBg="bg-brand-50"   iconColor="text-brand-600"   label="Juridike"         sub="Procedime gjyqësore" />}
          </div>
        </div>

        {/* Portfolio */}
        {can("page:institutions") && (
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Portofol</div>
            <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <NavRow href="/institutions" icon={Building2} iconBg="bg-gray-100" iconColor="text-gray-600" label="Institucione" sub="Bankat dhe institucionet" />
            </div>
          </div>
        )}

        {/* Reports */}
        {(can("page:reports") || can("page:performance")) && (
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Raportim</div>
            <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {can("page:reports")     && <NavRow href="/reports"     icon={BarChart3}  iconBg="bg-purple-50" iconColor="text-purple-600" label="Raporte"      sub="Eksporto dhe filtro" />}
              {can("page:performance") && <NavRow href="/performance" icon={TrendingUp} iconBg="bg-indigo-50" iconColor="text-indigo-600" label="Performanca"  sub="Statistikat sipas oficerit" />}
            </div>
          </div>
        )}

        {/* Admin */}
        {(can("page:admin:users") || can("page:admin:offices")) && (
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Administrim</div>
            <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {can("page:admin:users")  && <NavRow href="/admin/users"     icon={Users}    iconBg="bg-gray-100" iconColor="text-gray-600" label="Përdoruesit" sub="Menaxho llogari" />}
              {can("page:admin:offices")&& <NavRow href="/admin/reference" icon={Database} iconBg="bg-gray-100" iconColor="text-gray-600" label="Zyret"        sub="Statistikat sipas zyrës" />}
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white active:bg-red-50 transition-colors">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50">
              <LogOut size={17} className="text-red-500" />
            </div>
            <span className="text-[14px] font-medium text-red-600">Dilni</span>
          </button>
        </div>

      </div>
    </div>
  );
}
