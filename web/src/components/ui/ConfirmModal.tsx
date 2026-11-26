"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./Modal";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = red confirm, "brand" = purple (default) */
  variant?: "danger" | "brand";
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Konfirmo",
  cancelLabel = "Anulo",
  variant = "brand",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* caller handles errors */
    } finally {
      setLoading(false);
    }
  }

  const iconBg = variant === "danger" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600";
  const Icon = variant === "danger" ? Trash2 : AlertTriangle;

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <ModalHeader
        title={title}
        onClose={onClose}
        icon={
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon size={17} />
          </div>
        }
      />
      <ModalBody>
        <p className="text-[13px] text-gray-500 leading-relaxed">{message}</p>
      </ModalBody>
      <ModalFooter
        onClose={onClose}
        onConfirm={handle}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        loading={loading}
        variant={variant}
      />
    </Modal>
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
