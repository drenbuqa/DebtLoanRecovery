"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    // Trigger exit animation then remove
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 200);
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Desktop: bottom-right, stacks upward */}
      <div className="hidden md:flex fixed bottom-5 right-5 z-[100] flex-col-reverse gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} position="bottom" />
        ))}
      </div>
      {/* Mobile: top-center, full width with margins */}
      <div className="flex md:hidden fixed top-4 left-3 right-3 z-[100] flex-col gap-2 items-stretch pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} position="top" />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const CONFIG: Record<ToastType, { icon: typeof CheckCircle2; iconColor: string; borderColor: string }> = {
  success: { icon: CheckCircle2, iconColor: "text-emerald-500", borderColor: "border-l-emerald-400" },
  error:   { icon: XCircle,      iconColor: "text-red-500",     borderColor: "border-l-red-400"     },
  warning: { icon: AlertTriangle, iconColor: "text-amber-500",  borderColor: "border-l-amber-400"   },
};

function ToastItem({
  toast: t, onDismiss, position,
}: {
  toast: Toast; onDismiss: () => void; position: "top" | "bottom";
}) {
  const { icon: Icon, iconColor, borderColor } = CONFIG[t.type];
  const enterClass = position === "top" ? "animate-toast-in-top" : "animate-toast-in";

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 bg-white border border-gray-200 border-l-[3px] ${borderColor} rounded-xl px-4 py-3 shadow-lg ${t.exiting ? "animate-toast-out" : enterClass}`}
      style={{ maxWidth: 380 }}
    >
      <Icon size={16} className={`shrink-0 ${iconColor}`} />
      <span className="text-[13px] text-gray-800 flex-1 leading-snug">{t.message}</span>
      <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 ml-1">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
