"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatEnum } from "@/lib/utils";
import { cases as casesApi } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, RefreshCw, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";

const STAGE_BADGE: Record<string, any> = {
  D1: "active", D2: "warning", D3: "warning", D4: "danger",
  LEGAL: "legal", WRITTEN_OFF: "closed",
};

const NPL_LABELS: Record<string, string> = {
  PERFORMING: "Performues", WATCH: "Nën Vëzhgim",
  SUBSTANDARD: "Nënstandard", DOUBTFUL: "I Dyshimtë", LOSS: "Humbje",
};

interface Props {
  view: string;
  extraFilters?: Record<string, string>;
  showPromiseDate?: boolean;
}

export function CasesListView({ view, extraFilters = {}, showPromiseDate = false }: Props) {
  const router = useRouter();
  const { user, scopedToSelf, scopedToOffice } = useAuth();
  const [refreshing, triggerRefresh] = useRefreshing();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const isInitial = data.length === 0;
    if (isInitial) setLoading(true); else setPaging(true);
    setError(null);
    try {
      const res = await casesApi.list({
        page, limit: 50, search: search || undefined,
        view,
        ...extraFilters,
        ...(scopedToSelf && user?.id ? { officerId: user.id } : {}),
        ...(scopedToOffice && user?.officeId ? { officeId: user.officeId } : {}),
      });
      setData(res.data);
      setMeta(res.meta);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setPaging(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, view]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6 space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
            placeholder="Kërko debitor, ref. dosje…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-gray-400">{!loading && `${meta.total.toLocaleString()} dosje`}</span>
          <button onClick={() => triggerRefresh(load)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {error ? (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            Ka ndodhur një gabim: {error} <button onClick={load} className="underline ml-2">Riprovo</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : data.length === 0 && !paging ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Briefcase size={22} className="text-gray-400" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën dosje</div>
              <div className="text-[12px] text-gray-400 max-w-xs">Nuk ka dosje që plotësojnë kriteret.</div>
            </div>
          </div>
        ) : (
          <div className={`transition-opacity duration-150 ${paging ? "opacity-50 pointer-events-none" : "opacity-100"} overflow-x-auto`}>
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Emri / ID", "Telefon", "Adresa", "Banka", "Balanca", "Zyrtari 1", "Zyrtari 2", "Qyteti", "Kategoria", "Garant 1", "Garant 2", "Bashkëkreditues", "Faza", ...(showPromiseDate ? ["Premtimi"] : [])].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap bg-gray-50/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((c) => {
                  const b = c.loan?.borrower;
                  const parties = c.loan?.relatedParties ?? [];
                  const guarantors = parties.filter((p: any) => p.role === "GUARANTOR");
                  const coborrower = parties.find((p: any) => p.role === "CO_BORROWER");
                  const phone = b?.phones?.[0]?.phoneNumber;
                  const latestPromise = c.promisesToPay?.[0];
                  return (
                    <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors">
                      <td className="px-3 py-2 min-w-[160px]">
                        <div className="text-[12px] font-semibold text-gray-900 truncate max-w-[150px]">{b?.fullName ?? "—"}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{b?.personalId ?? c.caseReference}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-600 font-mono">{phone ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 max-w-[120px]">
                        <span className="text-[11px] text-gray-500 truncate block">{b?.address ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-[11px] text-gray-600">{c.loan?.institution?.shortName ?? "—"}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{c.loan?.loanNumber ?? ""}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[12px] font-bold text-gray-900 tabular-nums">{formatCurrency(Number(c.loan?.currentOutstandingBalance ?? 0))}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-600">{c.assignedOfficer?.fullName ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-500">{c.secondaryOfficer?.fullName ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-500">{b?.city ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[10px] text-gray-500">{c.loan?.nplClassification ? (NPL_LABELS[c.loan.nplClassification] ?? c.loan.nplClassification) : "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-600">{guarantors[0]?.person?.fullName ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-500">{guarantors[1]?.person?.fullName ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-500">{coborrower?.person?.fullName ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant={STAGE_BADGE[c.collectionStage] ?? "default"} className="text-[10px]">{formatEnum(c.collectionStage)}</Badge>
                      </td>
                      {showPromiseDate && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          {latestPromise ? (
                            <div>
                              <div className="text-[11px] font-medium text-gray-700">{new Date(latestPromise.promiseDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" })}</div>
                              <div className="text-[10px] text-gray-400">{formatCurrency(Number(latestPromise.promiseAmount ?? 0))}</div>
                            </div>
                          ) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12px] text-gray-400">
              {((page - 1) * 50) + 1}–{Math.min(page * 50, meta.total)} nga {meta.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || paging}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <span className="text-[12px] text-gray-500 tabular-nums min-w-[60px] text-center flex items-center justify-center gap-1.5">
                {paging ? <RefreshCw size={12} className="animate-spin text-gray-400" /> : null}
                {page} / {meta.pages}
              </span>
              <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page === meta.pages || paging}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
