"use client";

import React, { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { Lock, User, Mail, Shield, Building2, CheckCircle } from "lucide-react";
import { useFormErrors } from "@/lib/form";
import { AccessGuard } from "@/components/AccessGuard";
import { useAuth } from "@/lib/auth";
import { auth as authApi } from "@/lib/api";
import { ROLE_META } from "@/lib/permissions";

function SF({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">↑ {error}</p>}
    </div>
  );
}

function SettingsInner() {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { touch, touchAll, fieldError, reset } = useFormErrors();

  const E = {
    currentPw: fieldError("currentPw", currentPw, { required: true }),
    newPw:     fieldError("newPw",     newPw,     { required: true, minLength: 8 }),
    confirmPw: fieldError("confirmPw", confirmPw, {
      required: true,
      custom: (v) => v !== newPw ? "Fjalëkalimet nuk përputhen" : null,
    }),
  };

  const inp = (hasErr: boolean) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${hasErr ? "border-red-400 focus:border-red-400 bg-red-50/30" : "border-gray-200 focus:border-brand-400"}`;

  async function changePassword() {
    touchAll(["currentPw", "newPw", "confirmPw"]);
    if (E.currentPw || E.newPw || E.confirmPw) return;
    setSaving(true); setSubmitError(""); setSuccess(false);
    try {
      await authApi.changePassword(currentPw, newPw);
      setSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      reset();
    } catch (e: any) {
      setSubmitError(e.message ?? "Përditësimi i fjalëkalimit dështoi.");
    } finally { setSaving(false); }
  }

  const roleMeta = user?.role ? ROLE_META[user.role] : null;
  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "—";

  return (
    <div className="flex flex-col">
      <Topbar title="Cilësimet e Llogarisë" subtitle="Profili dhe cilësimet tuaja të sigurisë" />

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-[13px] font-semibold text-gray-900">Profili</h3>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-brand-700 text-[18px] font-bold">{initials}</span>
                </div>
                <div>
                  <div className="text-[16px] font-semibold text-gray-900">{user?.fullName ?? "—"}</div>
                  {roleMeta && (
                    <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${roleMeta.color}`}>
                      {roleMeta.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { icon: User,      label: "Emri i Përdoruesit", value: user?.username },
                  { icon: Mail,      label: "Email",              value: user?.email },
                  { icon: Shield,    label: "Roli",               value: roleMeta?.label ?? user?.role },
                  ...(user?.officeId ? [{ icon: Building2, label: "Zyra", value: user?.office?.name ?? "E caktuar" }] : []),
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</div>
                      <div className="text-[13px] font-medium text-gray-900 truncate">{value ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-400 mt-4">
                Për të ndryshuar emrin, emailin ose rolin tuaj, kontaktoni administratorin.
              </p>
            </div>
          </div>

          {/* Change password card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <Lock size={13} className="text-gray-400" />
              <h3 className="text-[13px] font-semibold text-gray-900">Ndrysho Fjalëkalimin</h3>
            </div>
            <div className="flex-1 flex items-center">
            <div className="w-full px-5 py-5 space-y-4">
              {success && (
                <div className="p-3 rounded-lg text-[13px] bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                  <CheckCircle size={14} className="shrink-0" />
                  Fjalëkalimi u ndryshua me sukses.
                </div>
              )}
              {submitError && (
                <div className="p-3 rounded-lg text-[13px] bg-red-50 border border-red-200 text-red-700">{submitError}</div>
              )}
              <SF label="Fjalëkalimi Aktual" error={E.currentPw}>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                  onBlur={() => touch("currentPw")} className={inp(!!E.currentPw)}
                  placeholder="Shkruani fjalëkalimin tuaj aktual" />
              </SF>
              <SF label="Fjalëkalimi i Ri" error={E.newPw}>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                  onBlur={() => touch("newPw")} className={inp(!!E.newPw)} placeholder="Min. 8 karaktere" />
              </SF>
              <SF label="Konfirmo Fjalëkalimin e Ri" error={E.confirmPw}>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  onBlur={() => touch("confirmPw")} className={inp(!!E.confirmPw)} placeholder="Përsëriteni fjalëkalimin e ri" />
              </SF>
              <div className="flex justify-end pt-1">
                <button onClick={changePassword} disabled={saving}
                  className="px-5 py-2 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {saving ? "Duke ruajtur…" : "Përditëso Fjalëkalimin"}
                </button>
              </div>
            </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SystemPage() {
  return (
    <AccessGuard permission="page:settings">
      <SettingsInner />
    </AccessGuard>
  );
}
