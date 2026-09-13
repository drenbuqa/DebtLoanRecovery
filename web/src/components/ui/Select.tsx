"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

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
  searchable?: boolean;
}

export function Select({ value, onChange, options, placeholder = "Select…", label, className = "", disabled = false, dropUp = false, searchable = false }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setQuery("");
  }, [open, searchable]);

  function pick(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
  }

  const filtered = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 400 }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all
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
          {/* In dropUp mode: list first, search at bottom (closest to button) */}
          {/* In dropDown mode: search first, list below */}
          {searchable && !dropUp && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                <Search size={12} className="text-gray-400 shrink-0" />
                <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kërko…"
                  className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-400" />
              </div>
            </div>
          )}
          <div className="max-h-44 overflow-y-auto py-1">
            {placeholder && !query && (
              <button type="button" onClick={() => pick("")}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer
                  ${value === "" ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-400 hover:bg-gray-50"}`}>
                <span>{placeholder}</span>
                {value === "" && <Check size={13} className="text-brand-600 shrink-0" />}
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-3.5 py-4 text-[12px] text-gray-400 text-center">Nuk u gjet asgjë</div>
            )}
            {filtered.map((opt) => (
              <button key={opt.value} type="button" onClick={() => pick(opt.value)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] text-left transition-colors cursor-pointer
                  ${opt.value === value ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                <span>{opt.label}</span>
                {opt.value === value && <Check size={13} className="text-brand-600 shrink-0" />}
              </button>
            ))}
          </div>
          {searchable && dropUp && (
            <div className="p-2 border-t border-gray-100">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                <Search size={12} className="text-gray-400 shrink-0" />
                <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kërko…"
                  className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-400" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
