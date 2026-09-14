"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
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
  { key: "last_month", label: "Muaji kaluar" },
  { key: "3months",    label: "3 muajt e fundit" },
];

export const PERFORMANCE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "month",      label: "Ky muaj" },
  { key: "last_month", label: "Muaji kaluar" },
  { key: "3months",    label: "3 muajt e fundit" },
  { key: "6months",    label: "6 muajt e fundit" },
  { key: "year",       label: "Ky vit" },
];

interface Props {
  value: DatePreset;
  onChange: (preset: DatePreset, range: DateRange) => void;
  presets?: { key: DatePreset; label: string }[];
  label?: string;
  className?: string;
}

export function DatePresetPicker({ value, onChange, presets = DEFAULT_PRESETS, label, className = "" }: Props) {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = presets.find((p) => p.key === value) ?? presets[0];

  function handleOpen() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const navH = window.innerWidth < 768 ? 90 : 0;
      const spaceBelow = window.innerHeight - rect.bottom - navH - 8;
      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 4,
        minWidth: rect.width,
        zIndex: 9999,
        maxHeight: Math.min(spaceBelow, 320),
        overflowY: "auto",
      });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  const dropdown = open ? (
    <div ref={dropdownRef} style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
      <div className="py-1">
        {presets.map(({ key, label: optLabel }) => (
          <button key={key} type="button"
            onClick={() => { onChange(key, presetToRange(key)); setOpen(false); }}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-[13px] text-left transition-colors cursor-pointer
              ${key === value ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
            <span>{optLabel}</span>
            {key === value && <Check size={13} className="text-brand-600 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 400 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all bg-white text-left cursor-pointer
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

      {mounted && createPortal(dropdown, document.body)}
    </div>
  );
}
