"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
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
  clearable?: boolean;
}

export function Select({ value, onChange, options, placeholder = "Zgjidhni…", label, className = "", disabled = false, dropUp = false, searchable = false, clearable = false }: SelectProps) {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  function computeStyle(): React.CSSProperties {
    if (!ref.current) return {};
    const rect = ref.current.getBoundingClientRect();
    const navH = window.innerWidth < 768 ? 90 : 0;
    const spaceBelow = window.innerHeight - rect.bottom - navH - 8;
    const spaceAbove = rect.top - 8;
    const openUp = dropUp || spaceBelow < 220;
    if (openUp) {
      return { position: "fixed", left: rect.left, bottom: window.innerHeight - rect.top + 4, width: rect.width, zIndex: 9999, maxHeight: Math.min(spaceAbove, 320) };
    }
    return { position: "fixed", left: rect.left, top: rect.bottom + 4, width: rect.width, zIndex: 9999, maxHeight: Math.min(spaceBelow, 320) };
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const clickedTrigger = ref.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);
      if (!clickedTrigger && !clickedDropdown) {
        setOpen(false);
        setQuery("");
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

  const openUp = dropUp || (ref.current ? (window.innerHeight - ref.current.getBoundingClientRect().bottom) < 220 : false);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col overflow-hidden"
    >
      {searchable && !openUp && (
        <div className="p-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko…"
              className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-400" />
          </div>
        </div>
      )}
      <div className="overflow-y-auto py-1 min-h-0 flex-1">
        {clearable && placeholder && !query && (
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
      {searchable && openUp && (
        <div className="p-2 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko…"
              className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-400" />
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!open) setDropdownStyle(computeStyle()); setOpen((o) => !o); }}
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

      {mounted && createPortal(dropdown, document.body)}
    </div>
  );
}
