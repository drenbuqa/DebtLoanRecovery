"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Max width class — defaults to max-w-md */
  maxWidth?: string;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdrop?: boolean;
}

/** Shared modal shell: backdrop + centered panel */
export function Modal({ onClose, children, maxWidth = "max-w-md", closeOnBackdrop = true }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-backdrop-in modal-backdrop"
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden animate-modal-in modal-panel`}>
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Optional icon element shown left of the title */
  icon?: ReactNode;
}

export function ModalHeader({ title, subtitle, onClose, icon }: ModalHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
      {icon && (
        <div className="shrink-0">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-[15px] font-semibold text-gray-900 leading-snug">{title}</h2>
        {subtitle && <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors modal-close-btn"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-5 ${className}`}>{children}</div>
  );
}

interface ModalFooterProps {
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: ReactNode;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** "brand" = purple (default), "danger" = red, "none" = no confirm button */
  variant?: "brand" | "danger" | "none";
  /** Extra content on the left side of the footer */
  leftSlot?: ReactNode;
}

export function ModalFooter({
  onClose,
  onConfirm,
  confirmLabel = "Konfirmo",
  cancelLabel = "Anulo",
  loading = false,
  disabled = false,
  variant = "brand",
  leftSlot,
}: ModalFooterProps) {
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
      : "bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60";

  return (
    <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
      {leftSlot && <div className="flex-1">{leftSlot}</div>}
      <div className={`flex items-center gap-3 ${leftSlot ? "" : "ml-auto"}`}>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="h-9 px-4 rounded-xl text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {cancelLabel}
        </button>
        {variant !== "none" && onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || disabled}
            className={`h-9 px-4 rounded-xl text-[13px] font-semibold transition-colors ${confirmClass}`}
          >
            {loading ? "Ju lutem prisni…" : confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}
