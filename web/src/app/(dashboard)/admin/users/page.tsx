"use client";

import React, { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { users as usersApi, offices as officesApi } from "@/lib/api";
import { RefreshCw, Plus, UserCheck, UserX, Edit2, Key, X, Search, Users } from "lucide-react";
import { useFormErrors, validate } from "@/lib/form";
import { AccessGuard } from "@/components/AccessGuard";
import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useRefreshing } from "@/lib/useRefreshing";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";

const ROLE_STYLES: Record<string, string> = {
  ADMIN:   "bg-gray-800 text-white",
  MANAGER: "bg-brand-100 text-brand-700",
  OFFICER: "bg-gray-100 text-gray-600",
  VIEWER:  "bg-gray-100 text-gray-400",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator", MANAGER: "Menaxher", OFFICER: "Oficer", VIEWER: "Vëzhgues",
};

// ── Shared primitives ────────────────────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in modal-panel">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
        {label}
        {required ? <span className="text-red-500 font-bold">*</span> : <span className="text-gray-300 font-normal normal-case tracking-normal text-[10px]">(opsionale)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">↑ {error}</p>}
    </div>
  );
}

function TextInput({ hasError, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input {...props}
      className={`w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${hasError ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`} />
  );
}

// ── User create/edit modal ───────────────────────────────────
function UserModal({ user, offices, onClose, onSaved }: { user?: any; offices: any[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username ?? "",
    fullName: user?.fullName ?? "",
    email:    user?.email ?? "",
    role:     user?.role ?? "OFFICER",
    officeId: user?.officeId ?? "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { touch, touchAll, fieldError } = useFormErrors();

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const E = {
    username: !isEdit ? fieldError("username", form.username, { required: true, minLength: 3 }) : null,
    fullName: fieldError("fullName", form.fullName, { required: true }),
    email:    fieldError("email",    form.email,    { required: true, email: true }),
    password: !isEdit ? fieldError("password", form.password, { required: true, minLength: 8 }) : null,
  };

  async function submit() {
    const fields = isEdit
      ? ["fullName", "email"]
      : ["username", "fullName", "email", "password"];
    touchAll(fields);
    const hasError = fields.some((f) => (E as any)[f] !== null);
    if (hasError) return;

    // Extra check: password confirm not needed here but re-validate length
    if (!isEdit && validate(form.password, { required: true, minLength: 8 })) return;

    setLoading(true); setSubmitError("");
    try {
      const dto: any = { fullName: form.fullName, email: form.email, role: form.role, officeId: form.officeId || undefined };
      if (!isEdit) { dto.username = form.username; dto.password = form.password; }
      isEdit ? await usersApi.update(user.id, dto) : await usersApi.create(dto);
      onSaved(); onClose();
    } catch (e: any) { setSubmitError(e.message); } finally { setLoading(false); }
  }

  return (
    <ModalShell title={isEdit ? "Ndrysho Përdoruesin" : "Përdorues i Ri"} onClose={onClose}>
      <div className="p-6 space-y-4">
        {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{submitError}</div>}
        {!isEdit && (
          <Field label="Emri i Përdoruesit" required error={E.username}>
            <TextInput hasError={!!E.username} value={form.username}
              onChange={(e) => set("username", e.target.value)}
              onBlur={() => touch("username")}
              placeholder="p.sh. jon.gjokaj" autoFocus />
          </Field>
        )}
        <Field label="Emri i Plotë" required error={E.fullName}>
          <TextInput hasError={!!E.fullName} value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            onBlur={() => touch("fullName")}
            placeholder="Jon Gjokaj" autoFocus={isEdit} />
        </Field>
        <Field label="Email" required error={E.email}>
          <TextInput hasError={!!E.email} type="email" value={form.email}
            onChange={(e) => set("email", e.target.value)}
            onBlur={() => touch("email")}
            placeholder="jon@dlr.com" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Roli" required>
            <select value={form.role} onChange={(e) => set("role", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 bg-white">
              <option value="ADMIN">Administrator</option>
              <option value="MANAGER">Menaxher</option>
              <option value="OFFICER">Oficer</option>
              <option value="VIEWER">Vëzhgues</option>
            </select>
          </Field>
          <Field label="Zyra">
            <select value={form.officeId} onChange={(e) => set("officeId", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 bg-white">
              <option value="">Pa zyrë</option>
              {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
        </div>
        {!isEdit && (
          <Field label="Fjalëkalimi" required error={E.password}>
            <TextInput hasError={!!E.password} type="password" value={form.password}
              onChange={(e) => set("password", e.target.value)}
              onBlur={() => touch("password")}
              placeholder="Min. 8 karaktere" />
          </Field>
        )}
      </div>
      <div className="px-6 pb-5 flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
        <button onClick={submit} disabled={loading}
          className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {loading ? "Duke ruajtur…" : isEdit ? "Ruaj Ndryshimet" : "Krijo Përdoruesin"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Reset password modal ─────────────────────────────────────
function ResetPasswordModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [newPw, setNewPw]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const { touch, touchAll, fieldError } = useFormErrors();

  const pwError      = fieldError("newPw",  newPw,  { required: true, minLength: 8 });
  const confirmError = fieldError("confirm", confirm, {
    required: true,
    custom: (v) => v !== newPw ? "Fjalëkalimet nuk përputhen" : null,
  });

  async function submit() {
    touchAll(["newPw", "confirm"]);
    if (pwError || confirmError) return;
    setLoading(true); setSubmitError("");
    try {
      await usersApi.update(user.id, { password: newPw });
      setSuccess(true);
    } catch (e: any) { setSubmitError(e.message); } finally { setLoading(false); }
  }

  return (
    <ModalShell title={`Rivendos Fjalëkalimin — ${user.fullName}`} onClose={onClose}>
      <div className="p-6 space-y-4">
        {success ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 text-center">
            Fjalëkalimi u ndryshua me sukses. Përdoruesi mund të hyjë tani me fjalëkalimin e ri.
          </div>
        ) : (
          <>
            {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{submitError}</div>}
            <p className="text-[12px] text-gray-500">
              Vendosni një fjalëkalim të ri për <span className="font-semibold text-gray-700">{user.fullName}</span> (@{user.username}). Ndajeni me ta në mënyrë të sigurt pas ruajtjes.
            </p>
            <Field label="Fjalëkalimi i Ri" required error={pwError}>
              <TextInput hasError={!!pwError} type="password" value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                onBlur={() => touch("newPw")}
                placeholder="Min. 8 karaktere" autoFocus />
            </Field>
            <Field label="Konfirmo Fjalëkalimin" required error={confirmError}>
              <TextInput hasError={!!confirmError} type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => touch("confirm")}
                placeholder="Përsëriteni fjalëkalimin e ri" />
            </Field>
          </>
        )}
      </div>
      <div className="px-6 pb-5 flex gap-3 justify-end">
        {success ? (
          <button onClick={onClose} className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 transition-colors">U krye</button>
        ) : (
          <>
            <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors">Anulo</button>
            <button onClick={submit} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
              <Key size={13} /> {loading ? "Duke ruajtur…" : "Rivendos Fjalëkalimin"}
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// ── Page ─────────────────────────────────────────────────────
function UsersAdminPageInner() {
  const { can, user: authUser, scopedToOffice } = useAuth();
  const { toast } = useToast();
  const [data, setData]           = useState<any[]>([]);
  const [offices, setOffices]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [modal, setModal]         = useState<"create" | "edit" | "reset" | null>(null);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [filter, setFilter]       = useState<"active" | "all" | "inactive">("active");
  const [confirmModal, openConfirm] = useConfirm();
  const [refreshing, triggerRefresh] = useRefreshing();

  async function load() {
    setLoading(true); setError("");
    try {
      const params = scopedToOffice && authUser?.officeId ? { officeId: authUser.officeId } : {};
      const [u, o] = await Promise.all([usersApi.list(params), officesApi.list()]);
      setData(u); setOffices(o);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openEdit(u: any)  { setActiveUser(u); setModal("edit"); }
  function openReset(u: any) { setActiveUser(u); setModal("reset"); }
  function closeModal()      { setModal(null); setActiveUser(null); }

  function deactivate(u: any) {
    openConfirm({
      title: `Çaktivizo ${u.fullName}`,
      message: "Ky përdorues do të humbasë aksesin në platformë menjëherë. Mund ta riaktivizoni në çdo kohë.",
      confirmLabel: "Çaktivizo",
      variant: "danger",
      onConfirm: async () => { await usersApi.deactivate(u.id); load(); toast("Përdoruesi u çaktivizua"); },
    });
  }

  function reactivate(u: any) {
    openConfirm({
      title: `Riaktivizo ${u.fullName}`,
      message: "Ky përdorues do të rifitojë aksesin në platformë me rolin dhe lejet e mëparshme.",
      confirmLabel: "Riaktivizo",
      variant: "default",
      onConfirm: async () => { await usersApi.update(u.id, { isActive: true }); load(); toast("Përdoruesi u riaktivizua"); },
    });
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const activeCount   = data.filter((u) => u.isActive).length;
  const inactiveCount = data.filter((u) => !u.isActive).length;

  const uq = searchQuery.trim().toLowerCase();
  const filtered = data.filter((u) => {
    const matchesTab = filter === "all" ? true : filter === "active" ? u.isActive : !u.isActive;
    const matchesSearch = !uq || (u.fullName ?? "").toLowerCase().includes(uq) || (u.email ?? "").toLowerCase().includes(uq) || (u.username ?? "").toLowerCase().includes(uq);
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesTab && matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col">
      {confirmModal}
      {modal === "create" && <UserModal offices={offices} onClose={closeModal} onSaved={() => { load(); toast("Përdoruesi u krijua"); }} />}
      {modal === "edit"   && <UserModal user={activeUser} offices={offices} onClose={closeModal} onSaved={() => { load(); toast("Përdoruesi u përditësua"); }} />}
      {modal === "reset"  && <ResetPasswordModal user={activeUser} onClose={closeModal} onSaved={() => { load(); toast("Fjalëkalimi u rivendos"); }} />}

      <Topbar title="Përdoruesit & Aksesi" subtitle="Menaxhoni llogaritë, rolet dhe caktimet e zyrave" />

      <div className="p-4 md:p-6 space-y-4">

        {/* Filter bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kërko sipas emrit ose emailit…"
                className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-400" />
            </div>
            <Select
              label="Roli"
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="Të gjithë"
              clearable
              options={[
                { value: "ADMIN",   label: "Administrator" },
                { value: "MANAGER", label: "Menaxher" },
                { value: "OFFICER", label: "Oficer" },
                { value: "VIEWER",  label: "Vëzhgues" },
              ]}
            />
            {can("user:create") && (
              <button onClick={() => setModal("create")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors ml-auto">
                <Plus size={13} /> Përdorues i Ri
              </button>
            )}
          </div>
          <div className="flex border-b border-gray-200">
            {([["active", "Aktiv", activeCount], ["all", "Të gjithë", data.length], ["inactive", "Joaktiv", inactiveCount]] as const).map(([val, label, count]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                  filter === val
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular ${filter === val ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-400"}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-[13px] text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Duke ngarkuar…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Users size={22} className="text-gray-400" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-700 mb-1">Nuk u gjetën përdorues</div>
              <div className="text-[12px] text-gray-400 max-w-xs">Provoni të ndryshoni kërkimin ose krijoni një përdorues të ri.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[12px] text-gray-400">{filtered.length} {filtered.length === 1 ? "përdorues" : "përdorues"}</span>
              <button onClick={() => triggerRefresh(load)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            {filtered.map((u) => (
              <div key={u.id}
                className={`bg-white rounded-xl border px-5 py-4 flex items-center gap-4 transition-opacity ${u.isActive ? "border-gray-200" : "border-gray-100 opacity-55"}`}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-brand-700 text-[13px] font-bold">
                    {u.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-gray-900">{u.fullName}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded tracking-wide ${ROLE_STYLES[u.role] ?? "bg-gray-100 text-gray-500"}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                    {!u.isActive && (
                      <span className="text-[11px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded tracking-wide">Joaktiv</span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-400 mt-0.5">
                    @{u.username} · {u.email}{u.office ? ` · ${u.office.name}` : ""}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {can("user:reset-password") && (
                    <button onClick={() => openReset(u)} title="Rivendos fjalëkalimin"
                      className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                      <Key size={13} />
                    </button>
                  )}
                  {can("user:edit") && (
                    <button onClick={() => openEdit(u)} title="Ndrysho përdoruesin"
                      className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                      <Edit2 size={13} />
                    </button>
                  )}
                  {can("user:deactivate") && (u.isActive ? (
                    <button onClick={() => deactivate(u)} title="Çaktivizo"
                      className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors">
                      <UserX size={13} />
                    </button>
                  ) : (
                    <button onClick={() => reactivate(u)} title="Riaktivizo"
                      className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                      <UserCheck size={13} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersAdminPage() {
  return (
    <AccessGuard permission="page:admin:users">
      <UsersAdminPageInner />
    </AccessGuard>
  );
}
