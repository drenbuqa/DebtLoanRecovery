"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  /** "danger" = red, default = gray */
  variant?: "danger" | "default";
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Konfirmo",
  variant = "default",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const btnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-brand-600 hover:bg-brand-700 text-white";

  const iconBg =
    variant === "danger"
      ? "bg-red-50 text-red-600"
      : "bg-brand-50 text-brand-600";

  async function handle() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* let the caller handle errors */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-modal-in modal-panel">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              {variant === "danger" ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-gray-900 leading-snug">{title}</h2>
              <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">{message}</p>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 shrink-0 -mt-0.5">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2.5 justify-end border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-150 rounded-xl transition-colors"
          >
            Anulo
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className={`px-4 py-2 text-[13px] font-medium rounded-xl transition-colors disabled:opacity-60 ${btnClass}`}
          >
            {loading ? "Ju lutem prisni…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook for managing a confirm dialog. Returns [confirm element | null, open function]. */
export function useConfirm() {
  const [state, setState] = useState<(Omit<ConfirmModalProps, "onClose"> & { id: number }) | null>(null);

  function open(props: Omit<ConfirmModalProps, "onClose">) {
    setState({ ...props, id: Date.now() });
  }

  const modal = state ? (
    <ConfirmModal key={state.id} {...state} onClose={() => setState(null)} />
  ) : null;

  return [modal, open] as const;
}
