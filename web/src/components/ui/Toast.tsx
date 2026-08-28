"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : AlertTriangle;
  const color = t.type === "success" ? "text-emerald-600" : t.type === "error" ? "text-red-500" : "text-amber-500";

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg animate-toast-in"
      style={{ minWidth: 240, maxWidth: 360 }}
    >
      <Icon size={16} className={`shrink-0 ${color}`} />
      <span className="text-[13px] text-gray-800 flex-1">{t.message}</span>
      <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
