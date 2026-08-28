"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency, formatEnum } from "@/lib/utils";
import { agreements as agreementsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";
import { RefreshCw, FileText, Search } from "lucide-react";
import { DatePresetPicker, DatePreset, presetToRange } from "@/components/ui/DatePresetPicker";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:    "Aktive",
  COMPLETED: "Përfunduar",
  BROKEN:    "Prishur",
  CANCELLED: "Anuluar",
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE:    "bg-emerald-400",
  COMPLETED: "bg-gray-300",
  BROKEN:    "bg-red-400",
  CANCELLED: "bg-gray-200",
};

function nextDueInstallment(installments: any[]) {
  if (!installments?.length) return null;
  const pending = installments.filter((i) => i.status !== "PAID" && i.status !== "WAIVED");
  if (!pending.length) return null;
  return pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
}

export default function AgreementsPage() {
  const { user, scopedToSelf, scopedToOffice } = useAuth();
  const [refreshing, triggerRefresh] = useRefreshing();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load(p = 1, status = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page: p, limit: 100, ...(status ? { status } : {}) };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      if (scopedToSelf   && user?.id)       params.officerId = user.id;
      if (scopedToOffice && user?.officeId) params.officeId  = user.officeId;
      const res = await agreementsApi.list(params);
      setData(res.data);
      setMeta(res.meta);
      setStats(res.stats ?? {});
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [scopedToSelf, user?.id]);

  const filterOptions = [
    { key: "", label: "Të gjitha" },
    ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label })),
  ];

  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? data.filter((a) => {
    const borrower = a.case?.loan?.borrower;
    const name = borrower ? `${borrower.firstName} ${borrower.lastName}`.toLowerCase() : "";
    const ref = (a.case?.caseReference ?? "").toLowerCase();
    return name.includes(q) || ref.includes(q);
  }) : data;

  return (
    <div className="flex flex-col">
      <Topbar title="Marrëveshjet" subtitle={scopedToSelf ? "Marrëveshjet tuaja aktive të ripagimit" : "Marrëveshjet e ripagimit dhe oraret e kësteve"} />

      <div className="p-4 md:p-6 space-y-5">

        {/* Filter bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kërko debitor ose dosje…"
                className="w-full pl-7 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400" />
            </div>
            <DatePresetPicker label="Periudha" value={datePreset} onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); load(1); }} />
          </div>
          <div className="flex border-b border-gray-200">
            {filterOptions.map(({ key, label }) => (
              <button key={key}
                onClick={() => { setStatusFilter(key); load(1, key); }}
                className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  statusFilter === key
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-gray-900">Regjistri i Marrëveshjeve</h3>
            <button onClick={() => triggerRefresh(() => load(page))} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {error} — <button onClick={() => load()} className="underline">Riprovo</button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
              <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FileText size={22} className="text-gray-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën marrëveshje</div>
                <div className="text-[12px] text-gray-400 max-w-xs">Marrëveshjet e ripagimit të krijuara për dosjet do të shfaqen këtu.</div>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <Thead>
                  <tr>
                    <Th>Referenca</Th>
                    <Th>Debitori</Th>
                    <Th>Dosja</Th>
                    <Th>Shuma Totale</Th>
                    <Th>Këste</Th>
                    <Th>Kësti i Ardhshëm</Th>
                    <Th>Data e Mbarimit</Th>
                    <Th>Statusi</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {filtered.map((a) => {
                    const paid = a.installments?.filter((i: any) => i.status === "PAID").length ?? 0;
                    const total = a.installments?.length ?? a.installmentCount;
                    const dotCls = STATUS_DOT[a.status] ?? "bg-gray-300";
                    const statusLabel = STATUS_LABELS[a.status] ?? formatEnum(a.status);
                    const nextInst = nextDueInstallment(a.installments);
                    const nextDueDate = nextInst ? new Date(nextInst.dueDate) : null;
                    const nextIsOverdue = nextDueDate && nextDueDate < new Date();
                    return (
                      <Tr key={a.id} onClick={() => window.location.href = `/cases/${a.case?.id}?tab=Agreements`}>
                        <Td><span className="font-mono text-[12px] text-gray-500">{a.agreementReference}</span></Td>
                        <Td>
                          <span className="font-medium text-gray-900">
                            {a.case?.loan?.borrower
                              ? `${a.case.loan.borrower.firstName} ${a.case.loan.borrower.lastName}`
                              : "—"}
                          </span>
                        </Td>
                        <Td><span className="font-mono text-[12px] text-gray-500">{a.case?.caseReference ?? "—"}</span></Td>
                        <Td><span className="font-semibold tabular text-gray-900">{formatCurrency(Number(a.totalAmount))}</span></Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="tabular text-gray-600 text-[12px]">{paid}/{total}</span>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-16">
                              <div className="h-full bg-gray-400 rounded-full" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </Td>
                        <Td>
                          {nextDueDate ? (
                            <div>
                              <span className={`tabular text-[12px] font-medium ${nextIsOverdue ? "text-red-600" : "text-gray-700"}`}>
                                {nextDueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              {nextIsOverdue && <div className="text-[10px] text-red-500">Me Vonesë</div>}
                              {nextInst?.amount && <div className="text-[10px] text-gray-400 tabular">{formatCurrency(Number(nextInst.amount))}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[12px]">—</span>
                          )}
                        </Td>
                        <Td>
                          <span className="tabular text-gray-500 text-[12px]">
                            {a.endDate ? new Date(a.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </span>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                            {statusLabel}
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>

              {meta && meta.pages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-[12px] text-gray-500">
                  <span>{((meta.page - 1) * 25) + 1}–{Math.min(meta.page * 25, meta.total)} of {meta.total}</span>
                  <div className="flex gap-2">
                    <button disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">Mëparshme</button>
                    <button disabled={meta.page >= meta.pages} onClick={() => load(meta.page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">Tjetër</button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

      </div>
    </div>
  );
}
