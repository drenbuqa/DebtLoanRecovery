"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency, formatEnum } from "@/lib/utils";
import { payments as paymentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";
import { RefreshCw, CreditCard, Search, ChevronLeft, ChevronRight, Ban, X } from "lucide-react";
import { DatePresetPicker, DatePreset } from "@/components/ui/DatePresetPicker";
import { useIsMobile } from "@/lib/useIsMobile";

function VoidModal({ payment, onClose, onVoided }: { payment: any; onClose: () => void; onVoided: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) { setError("Arsyeja është e detyrueshme."); return; }
    setLoading(true); setError(null);
    try {
      await paymentsApi.void(payment.id, reason.trim());
      onVoided();
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-modal-in modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Anulo Pagesën</h2>
            <p className="text-[12px] text-gray-400 mt-0.5 font-mono">{payment.paymentReference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800">
            Kjo do të anulojë <strong>{formatCurrency(Number(payment.amount))}</strong> dhe do të rikthejë balancën e kredisë. Ky veprim nuk mund të zhbëhet.
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Arsyeja e anulimit <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="p.sh. Pagesë e dyfishuar, gabim në shumë…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-brand-400 resize-none" />
          </div>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">Anulo</button>
          <button onClick={submit} disabled={loading} className="flex-1 h-10 rounded-xl bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {loading ? "Duke anuluar…" : "Konfirmo Anulimin"}
          </button>
        </div>
      </div>
    </div>
  );
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Kesh", BANK_TRANSFER: "Transfertë Bankare", CHECK: "Çek",
  ONLINE: "Online", OTHER: "Tjetër",
};

function PaymentCard({ p, onClick, scopedToSelf }: { p: any; onClick: () => void; scopedToSelf: boolean }) {
  const borrower = p.case?.loan?.borrower;
  const name = borrower ? `${borrower.firstName} ${borrower.lastName}` : "—";
  const date = new Date(p.paymentDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "long" });
  return (
    <div onClick={onClick} className="bg-white rounded-2xl border border-gray-200 p-4 active:bg-gray-50 cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-gray-900 truncate">{name}</div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{p.case?.caseReference ?? "—"}</div>
        </div>
        <span className="text-[15px] font-bold text-emerald-700 tabular shrink-0">{formatCurrency(Number(p.amount))}</span>
      </div>
      <div className="h-px bg-gray-100 mb-3" />
      <div className="flex items-center gap-3 text-[12px] text-gray-400">
        <span>{METHOD_LABELS[p.paymentMethod] ?? formatEnum(p.paymentMethod)}</span>
        <span className="w-1 h-1 rounded-full bg-gray-200" />
        <span>{date}</span>
        {!scopedToSelf && p.officer?.fullName && (
          <><span className="w-1 h-1 rounded-full bg-gray-200" /><span>{p.officer.fullName}</span></>
        )}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user, scopedToSelf, scopedToOffice } = useAuth();
  const [refreshing, triggerRefresh] = useRefreshing();

  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [voidTarget, setVoidTarget] = useState<any>(null);

  const canVoid = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, any> = { page: p, limit: 100 };
      if (scopedToSelf   && user?.id)       params.officerId = user.id;
      if (scopedToOffice && user?.officeId) params.officeId  = user.officeId;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res = await paymentsApi.list(params);
      setData(res.data);
      setMeta(res.meta);
      setStats(res.stats);
      setPage(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [scopedToSelf, user?.id, dateFrom, dateTo]);

  useEffect(() => { load(1); }, [load]);

  const total = meta?.total ?? 0;
  const pages = meta?.pages ?? 1;

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? data.filter((p) => {
        const borrower = p.case?.loan?.borrower;
        const name = borrower ? `${borrower.firstName} ${borrower.lastName}`.toLowerCase() : "";
        const ref = (p.case?.caseReference ?? "").toLowerCase();
        return name.includes(q) || ref.includes(q);
      })
    : data;

  const subtitle = scopedToSelf
    ? "Pagesat që keni regjistruar"
    : `${total.toLocaleString()} transaksione gjithsej`;

  return (
    <div className="flex flex-col">
      {voidTarget && (
        <VoidModal
          payment={voidTarget}
          onClose={() => setVoidTarget(null)}
          onVoided={() => { setVoidTarget(null); load(page); }}
        />
      )}
      <Topbar title="Pagesa" subtitle={loading ? "Duke ngarkuar…" : subtitle} help={[
        { title: "Çfarë është kjo faqe?", body: "Çdo pagesë e marrë nga çdo debitor shfaqet këtu, në të gjitha dosjet. Mund të shihni kush pagoi, sa dhe kur — e dobishme për kontrollin e arkëtimeve ditore ose përgatitjen e raportit mujor." },
        { title: "Si të regjistroni një pagesë", body: "Shkoni te dosja e debitorit (kërkoni emrin e tyre në krye), pastaj klikoni 'Regjistro Pagesën' brenda dosjes. Pagesa do të shfaqet këtu automatikisht pasi të ruhet." },
        { title: "Filtrimi sipas datës", body: "Përdorni zgjedhësin e datave në krye për të shfaqur vetëm pagesat nga një periudhë e caktuar — për shembull, të gjitha pagesat e marra këtë javë ose këtë muaj." },
      ]} />

      <div className="p-3 md:p-6 space-y-4 md:space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              label: scopedToSelf ? "Arkëtimet e Mia Sot" : "Arkëtime Sot",
              value: stats ? formatCurrency(stats.todayTotal ?? 0) : null,
            },
            {
              label: scopedToSelf ? "Arkëtimet e Mia Këtë Muaj" : "Arkëtime Këtë Muaj",
              value: stats ? formatCurrency(stats.monthTotal ?? 0) : null,
            },
            {
              label: scopedToSelf ? "Transaksionet e Mia" : "Gjithsej Transaksione",
              value: stats ? total.toLocaleString() : null,
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</div>
              {s.value !== null
                ? <div className="text-[22px] font-bold text-gray-900 tabular leading-tight mt-1.5">{s.value}</div>
                : <div className="h-7 w-28 bg-gray-100 rounded-lg mt-1.5 animate-pulse" />}
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kërko debitor ose dosje…"
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <DatePresetPicker label="Periudha" value={datePreset} onChange={(p, r) => { setDatePreset(p); setDateFrom(r.from); setDateTo(r.to); }} />
        </div>

        {isMobile ? (
          /* ── Mobile card list ── */
          <div className="space-y-2.5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
                {error} — <button onClick={() => load()} className="underline">Riprovo</button>
              </div>
            )}
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse space-y-3">
                  <div className="flex justify-between"><div className="h-4 w-32 bg-gray-100 rounded" /><div className="h-5 w-20 bg-gray-100 rounded" /></div>
                  <div className="h-px bg-gray-100" />
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 gap-4">
                <CreditCard size={22} className="text-gray-400" />
                <div className="text-[13px] font-semibold text-gray-700">Nuk u gjetën pagesa</div>
              </div>
            ) : (
              <>
                {filtered.map((p) => (
                  <PaymentCard key={p.id} p={p} scopedToSelf={scopedToSelf} onClick={() => p.case?.id && router.push(`/cases/${p.case.id}`)} />
                ))}
                {pages > 1 && (
                  <div className="flex items-center justify-between pt-1 pb-2">
                    <button disabled={page <= 1} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); load(page - 1); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-[12px] text-gray-500 tabular-nums min-w-[60px] text-center">{page} / {pages}</span>
                    <button disabled={page >= pages} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); load(page + 1); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ── Desktop table ── */
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">Regjistri i Pagesave</h3>
                {meta && <p className="text-[12px] text-gray-400">{total} transaksion{total !== 1 ? "e" : ""}</p>}
              </div>
              <button onClick={() => triggerRefresh(() => load(1))} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>

            {error && (
              <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
                {error} — <button onClick={() => load()} className="underline">Riprovo</button>
              </div>
            )}

            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-5 py-3.5 animate-pulse">
                    <div className="flex-1 space-y-2"><div className="h-3 w-40 bg-gray-100 rounded" /><div className="h-2.5 w-24 bg-gray-100 rounded" /></div>
                    <div className="h-3 w-16 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <CreditCard size={22} className="text-gray-400" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën pagesa</div>
                  <div className="text-[12px] text-gray-400 max-w-xs">
                    {dateFrom || dateTo ? "Provoni të ndryshoni intervalin e datave." : "Pagesat e regjistruara ndaj dosjeve do të shfaqen këtu."}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <Thead>
                    <tr>
                      <Th>Referenca</Th>
                      <Th>Debitori</Th>
                      <Th>Kredia #</Th>
                      <Th>Institucioni</Th>
                      <Th>Shuma</Th>
                      <Th>Data</Th>
                      {!scopedToSelf && <Th>Oficeri</Th>}
                      {canVoid && <Th />}
                    </tr>
                  </Thead>
                  <Tbody>
                    {filtered.map((p) => (
                      <Tr key={p.id} onClick={() => p.case?.id && router.push(`/cases/${p.case.id}`)}>
                        <Td><span className="font-mono text-[12px] text-gray-500">{p.paymentReference}</span></Td>
                        <Td>
                          <span className="font-medium text-gray-900">
                            {p.case?.loan?.borrower
                              ? `${p.case.loan.borrower.firstName} ${p.case.loan.borrower.lastName}`
                              : "—"}
                          </span>
                        </Td>
                        <Td><span className="tabular text-gray-500 font-mono text-[12px]">{p.case?.loan?.loanNumber ?? "—"}</span></Td>
                        <Td><span className="text-gray-500 text-[12px]">{p.case?.loan?.institution?.shortName ?? "—"}</span></Td>
                        <Td><span className="font-semibold text-emerald-700 tabular">{formatCurrency(Number(p.amount))}</span></Td>
                        <Td>
                          <span className="tabular text-gray-500 text-[12px]">
                            {new Date(p.paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        </Td>
                        {!scopedToSelf && <Td><span className="text-gray-500 text-[12px]">{p.officer?.fullName ?? "—"}</span></Td>}
                        {canVoid && (
                          <Td>
                            <button
                              onClick={(e) => { e.stopPropagation(); setVoidTarget(p); }}
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                              title="Anulo pagesën"
                            >
                              <Ban size={13} />
                            </button>
                          </Td>
                        )}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>

                {pages > 1 && (
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[12px] text-gray-400">{((page - 1) * 25) + 1}–{Math.min(page * 25, total)} nga {total.toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <button disabled={page <= 1} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); load(page - 1); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-[12px] text-gray-500 tabular-nums min-w-[60px] text-center">{page} / {pages}</span>
                      <button disabled={page >= pages} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); load(page + 1); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

      </div>
    </div>
  );
}
