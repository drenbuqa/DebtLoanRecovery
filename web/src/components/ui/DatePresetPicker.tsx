"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Calendar } from "lucide-react";

export type DatePreset = "" | "today" | "week" | "month" | "last_month" | "3months" | "6months" | "year";

interface DateRange { from: string; to: string; }

export function presetToRange(preset: DatePreset): DateRange {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = fmt(now);

  if (preset === "today")      return { from: today, to: today };
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    return { from: fmt(start), to: today };
  }
  if (preset === "month")      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if (preset === "last_month") {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
  }
  if (preset === "3months") {
    const s = new Date(now); s.setMonth(now.getMonth() - 3); return { from: fmt(s), to: today };
  }
  if (preset === "6months") {
    const s = new Date(now); s.setMonth(now.getMonth() - 6); return { from: fmt(s), to: today };
  }
  if (preset === "year")       return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: today };
  return { from: "", to: "" };
}

const DEFAULT_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "",           label: "Të gjitha" },
  { key: "today",      label: "Sot" },
  { key: "week",       label: "Kjo javë" },
  { key: "month",      label: "Ky muaj" },
  { key: "last_month", label: "Muaji i kaluar" },
  { key: "3months",    label: "3 muajt e fundit" },
];

export const PERFORMANCE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "month",      label: "Ky muaj" },
  { key: "last_month", label: "Muaji i kaluar" },
  { key: "3months",    label: "3 muajt e fundit" },
  { key: "6months",    label: "6 muajt e fundit" },
  { key: "year",       label: "Këtë vit" },
];

interface Props {
  value: DatePreset;
  onChange: (preset: DatePreset, range: DateRange) => void;
  presets?: { key: DatePreset; label: string }[];
  label?: string;
  className?: string;
}

export function DatePresetPicker({ value, onChange, presets = DEFAULT_PRESETS, label, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = presets.find((p) => p.key === value) ?? presets[0];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 400 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all bg-white text-left
          ${open
            ? "border-brand-400 shadow-[0_0_0_3px_rgba(167,139,250,0.15)]"
            : "border-gray-200 hover:border-gray-300"
          }`}
      >
        <Calendar size={13} className="text-gray-400 shrink-0" />
        <span className="flex items-center gap-1">
          {label && <span style={{ color: "#9ca3af" }}>{label} ·</span>}
          <span style={{ color: "#6b7280" }}>{selected.label}</span>
        </span>
        <ChevronDown size={13} className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden" style={{ minWidth: "160px" }}>
          <div className="py-1">
            {presets.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key, presetToRange(key)); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] text-left transition-colors
                  ${key === value ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span>{label}</span>
                {key === value && <Check size={13} className="text-brand-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
