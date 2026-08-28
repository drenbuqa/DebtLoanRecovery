"use client";

import { useEffect, useState, useCallback } from "react";
import { useFormErrors } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { useRefreshing } from "@/lib/useRefreshing";
import Topbar from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { tasks as tasksApi } from "@/lib/api";
import { RefreshCw, CheckCircle2, Circle, Plus, ClipboardList, X, Search, Pencil } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   "bg-red-400",
  MEDIUM: "bg-amber-400",
  LOW:    "bg-gray-300",
  NORMAL: "bg-gray-300",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "Prioritet i lartë", MEDIUM: "Prioritet mesatar", LOW: "Prioritet i ulët",
};

export default function TasksPage() {
  const { can, user, scopedToSelf, scopedToOffice } = useAuth();
  const { toast } = useToast();
  const [refreshing, triggerRefresh] = useRefreshing();
  const [data, setData] = useState<any[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editTask, setEditTask] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function openEdit(t: any) {
    setEditTask(t);
    setEditTitle(t.title);
    setEditDesc(t.description ?? "");
    setEditDue(t.dueDate ? t.dueDate.slice(0, 10) : "");
    setEditPriority(t.priority ?? "MEDIUM");
    setEditError("");
  }

  async function saveEdit() {
    if (!editTitle.trim()) { setEditError("Titulli është i detyrueshëm"); return; }
    setEditSaving(true); setEditError("");
    try {
      const updated = await tasksApi.update(editTask.id, {
        title: editTitle.trim(),
        description: editDesc || undefined,
        dueDate: editDue || undefined,
        priority: editPriority,
      });
      setData((prev) => prev.map((t) => t.id === editTask.id ? { ...t, ...updated } : t));
      setEditTask(null);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  }

  const load = useCallback(async (f: "all" | "pending" | "done" = filter) => {
    setLoading(true);
    setError(null);
    try {
      const base: any = { limit: 100 };
      if (scopedToSelf   && user?.id)       base.assignedToId = user.id;
      if (scopedToOffice && user?.officeId) base.officeId     = user.officeId;
      const params: any = { ...base };
      if (f === "pending") params.completed = "false";
      if (f === "done")    params.completed = "true";
      const [res, pendRes, doneRes] = await Promise.all([
        tasksApi.list(params),
        tasksApi.list({ ...base, limit: 1, completed: "false" }),
        tasksApi.list({ ...base, limit: 1, completed: "true" }),
      ]);
      setData(res.data);
      const pending = pendRes.meta?.total ?? 0;
      const done    = doneRes.meta?.total ?? 0;
      setPendingCount(pending);
      setDoneCount(done);
      setAllCount(pending + done);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter, scopedToSelf, scopedToOffice, user?.id, user?.officeId]);

  useEffect(() => { load(filter); }, [filter, load]);

  async function toggleTask(id: string, currentlyDone: boolean) {
    try {
      if (currentlyDone) {
        await tasksApi.uncomplete(id);
        setData((prev) => prev.map((t) => t.id === id ? { ...t, completedAt: null } : t));
        setPendingCount((c) => c + 1);
        setDoneCount((c) => Math.max(0, c - 1));
        toast("Detyra u rihap", "warning");
      } else {
        await tasksApi.complete(id);
        setData((prev) => prev.map((t) => t.id === id ? { ...t, completedAt: new Date().toISOString() } : t));
        setPendingCount((c) => Math.max(0, c - 1));
        setDoneCount((c) => c + 1);
        toast("Detyra u krye");
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  const { touch: touchTask, touchAll: touchAllTask, fieldError: taskFieldError, reset: resetTask } = useFormErrors();
  const titleError = taskFieldError("title", newTitle, { required: true });

  function closeCreateModal() {
    setShowCreate(false);
    setNewTitle(""); setNewDesc(""); setNewDue(""); setNewPriority("MEDIUM"); setCreateError("");
    resetTask();
  }

  async function createTask() {
    touchAllTask(["title"]);
    if (!newTitle.trim()) return;
    setCreating(true); setCreateError("");
    try {
      const task = await tasksApi.create({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        dueDate: newDue || undefined,
        priority: newPriority,
      });
      if (filter !== "done") setData((prev) => [task, ...prev]);
      setPendingCount((c) => c + 1);
      setAllCount((c) => c + 1);
      closeCreateModal();
      toast("Detyra u krijua");
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  const isOverdue = (t: any) => t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date();

  const tq = searchQuery.trim().toLowerCase();
  const filteredData = tq ? data.filter((t) => (t.title ?? "").toLowerCase().includes(tq)) : data;

  return (
    <div className="flex flex-col">
      <Topbar title="Detyra" subtitle={scopedToSelf ? "Lista juaj e detyrimeve dhe ndjekjeve" : "Lista e detyrimeve dhe ndjekjeve të ekipit"} help={[
        { title: "Çfarë janë detyrat?", body: "Detyrat janë kujtuese për gjërat që duhen bërë — ndjekje pas një telefonate, mbledhje dokumenti, planifikim vizite. Çdo detyrë mund të lidhet me një dosje specifike që asgjë të mos harrohet." },
        { title: "Shënimi i një detyre si të kryer", body: "Klikoni rrethin në të majtë të çdo detyre për ta shënuar si të kryer. Ajo do të kalojë në skedën 'Të kryera'. Mund ta rihapni nëse nevojitet." },
        { title: "Detyrat e theksuara me të kuqe", body: "Një detyrë e kuqe është me vonesë — data e skadimit ka kaluar. Përqendrohuni te këto fillimisht. Detyrat me afat sot shfaqen në krye të listës." },
        { title: "Krijimi i një detyre", body: "Klikoni 'Detyrë e Re' në këndin e sipërm djathtas. Jepni një titull, vendosni datën e skadimit dhe zgjidhni prioritetin. Mund ta lidhni edhe me një dosje që të shfaqet dhe në detajet e dosjes." },
      ]} />

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in modal-panel">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Detyrë e Re</h2>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{createError}</div>
              )}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  Titulli <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => touchTask("title")}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && createTask()}
                  placeholder="Çfarë duhet bërë?"
                  autoFocus
                  className={`w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${titleError ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`}
                />
                {titleError && <p className="mt-1 text-[11px] text-red-500">↑ {titleError}</p>}
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  Përshkrimi <span className="text-gray-300 font-normal normal-case tracking-normal text-[10px]">(opsionale)</span>
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detaje shtesë…"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    Data e Skadimit <span className="text-gray-300 font-normal normal-case tracking-normal text-[10px]">(opsionale)</span>
                  </label>
                  <DatePicker value={newDue} onChange={setNewDue} placeholder="Pa afat skadimi" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    Prioriteti <span className="text-red-500 font-bold">*</span>
                  </label>
                  <Select value={newPriority} onChange={setNewPriority} options={[
                    { value: "HIGH", label: "I lartë" },
                    { value: "MEDIUM", label: "Mesatar" },
                    { value: "LOW", label: "I ulët" },
                  ]} />
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={closeCreateModal} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">
                Anulo
              </button>
              <button onClick={createTask} disabled={creating}
                className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {creating ? "Duke krijuar…" : "Krijo Detyrën"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-5">

        {/* Filter bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kërko detyra…"
                className="w-full pl-7 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400" />
            </div>
            {can("task:create") && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors ml-auto">
                <Plus size={14} /> Detyrë e Re
              </button>
            )}
          </div>
          <div className="flex border-b border-gray-200">
            {([
              { key: "all",     label: "Të gjitha",  count: allCount },
              { key: "pending", label: "Në pritje",  count: pendingCount },
              { key: "done",    label: "Të kryera",  count: doneCount },
            ] as const).map(({ key, label, count }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                  filter === key
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular ${filter === key ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-400"}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {error} — <button onClick={() => load(filter)} className="underline">Riprovo</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : filteredData.length === 0 ? (
          <Card padding="none">
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <ClipboardList size={22} className="text-gray-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-700 mb-1">
                  {filter === "pending" ? "Nuk ka detyra të hapura" : filter === "done" ? "Gjithçka është kryer" : "Ende nuk ka detyra"}
                </div>
                <div className="text-[12px] text-gray-400 max-w-xs">
                  {filter === "pending" ? "Nuk ka detyra që presin veprim." : filter === "done" ? "Detyrat e kryera do të shfaqen këtu." : "Krijoni një detyrë për të ndjekur veprimet dhe ndjekjet."}
                </div>
              </div>
              {filter !== "done" && can("task:create") && (
                <button onClick={() => setShowCreate(true)}
                  className="mt-1 px-4 py-2 text-[12px] font-medium text-brand-700 border border-brand-200 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors">
                  Detyrë e Re
                </button>
              )}
            </div>
          </Card>
        ) : (
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-gray-900">Detyra</h3>
              <button onClick={() => triggerRefresh(() => load(filter))} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            <ul className="divide-y divide-gray-50">
              {filteredData.map((t) => {
                const done = !!t.completedAt;
                const overdue = isOverdue(t);
                const prioDot = PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.MEDIUM;
                return (
                  <li key={t.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group">
                    <button
                      onClick={() => toggleTask(t.id, done)}
                      title={done ? "Shëno si të pakryer" : "Shëno si të kryer"}
                      className={`mt-0.5 shrink-0 transition-colors ${done ? "text-emerald-500 hover:text-gray-400" : "text-gray-300 hover:text-brand-500"}`}
                    >
                      {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium leading-snug ${done ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {t.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${prioDot}`} />
                          {t.priority}
                        </span>
                        {t.case && (
                          <button onClick={(e) => { e.stopPropagation(); window.location.href = `/cases/${t.case.id}`; }}
                            className="text-[11px] text-brand-600 hover:underline font-mono">
                            {t.case.caseReference}
                          </button>
                        )}
                        {t.assignedTo && (
                          <span className="text-[11px] text-gray-400">{t.assignedTo.fullName}</span>
                        )}
                        {t.dueDate && (
                          <span className={`text-[11px] font-medium ${overdue ? "text-red-600" : "text-gray-400"}`}>
                            {overdue ? "Me vonesë · " : "Afati "}
                            {new Date(t.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                        {done && t.completedAt && (
                          <span className="text-[11px] text-gray-400">
                            Kryer {new Date(t.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    {can("task:create") && (
                      <button onClick={() => openEdit(t)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                        <Pencil size={13} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

      </div>

      {/* ── Edit Task modal ── */}
      {editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in modal-panel">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Ndrysho Detyrën</h2>
              <button onClick={() => setEditTask(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{editError}</div>}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Titulli <span className="text-red-500">*</span></label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Përshkrimi</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Data e Skadimit</label>
                  <DatePicker value={editDue} onChange={setEditDue} placeholder="Pa afat skadimi" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Prioriteti</label>
                  <Select value={editPriority} onChange={setEditPriority} placeholder="Prioriteti"
                    options={[{ value: "HIGH", label: "I lartë" }, { value: "MEDIUM", label: "Mesatar" }, { value: "LOW", label: "I ulët" }]} />
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setEditTask(null)} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
              <button onClick={saveEdit} disabled={editSaving}
                className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {editSaving ? "Duke ruajtur…" : "Ruaj Ndryshimet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
