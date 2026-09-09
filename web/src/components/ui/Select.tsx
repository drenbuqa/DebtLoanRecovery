"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  dropUp?: boolean;
}

export function Select({ value, onChange, options, placeholder = "Select…", label, className = "", disabled = false, dropUp = false }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function pick(val: string) {
    onChange(val);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 400 }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border transition-all
          ${open
            ? "border-brand-400 shadow-[0_0_0_3px_rgba(167,139,250,0.15)] bg-white"
            : "border-gray-200 bg-white hover:border-gray-300"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          text-left`}
      >
        <span className="flex items-center gap-1 min-w-0" style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 400 }}>
          {label && <span className="shrink-0" style={{ color: "#9ca3af" }}>{label} ·</span>}
          <span className="truncate" style={{ color: "#6b7280" }}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={13}
          className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className={`absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden ${dropUp ? "bottom-full mb-1" : "top-full mt-1"}`}
          style={{ minWidth: "100%" }}>
          <div className="max-h-52 overflow-y-auto py-1">
            {/* Reset option — always shown so the user can go back to "all" */}
            {placeholder && (
              <button
                type="button"
                onClick={() => pick("")}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer
                  ${value === ""
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-400 hover:bg-gray-50"
                  }`}
              >
                <span>{placeholder}</span>
                {value === "" && <Check size={13} className="text-brand-600 shrink-0" />}
              </button>
            )}
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer
                  ${opt.value === value
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check size={13} className="text-brand-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
