"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
  allLabel?: string;
}

interface SingleFilterChipProps {
  group: FilterGroup;
}

function SingleFilterChip({ group }: SingleFilterChipProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = group.options.find((o) => o.value === group.value)?.label;
  const hasValue = Boolean(group.value);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function select(v: string) {
    group.onChange(v);
    setOpen(false);
  }

  return (
    <>
      {/* Chip button */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl border text-[12px] font-medium transition-colors shrink-0 self-stretch ${
          hasValue
            ? "bg-brand-600 text-white border-brand-600"
            : "bg-white text-gray-600 border-gray-200"
        }`}>
        <span>{hasValue ? selectedLabel : group.label}</span>
        {hasValue ? (
          <span
            onClick={(e) => { e.stopPropagation(); group.onChange(""); }}
            className="ml-0.5 flex items-center">
            <X size={11} />
          </span>
        ) : (
          <ChevronDown size={11} className="text-gray-400" />
        )}
      </button>

      {/* Focused single-filter sheet */}
      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className="relative bg-white rounded-t-[20px] w-full"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
              animation: "sheet-in 0.22s cubic-bezier(0.32,0.72,0,1) forwards",
            }}
            onClick={(e) => e.stopPropagation()}>

            {/* Handle */}
            <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-gray-100">
              <h3 className="text-[15px] font-semibold text-gray-900">{group.label}</h3>
              {hasValue && (
                <button onClick={() => { group.onChange(""); setOpen(false); }}
                  className="text-[13px] text-gray-400 font-medium">
                  Fshij
                </button>
              )}
            </div>

            {/* Options — short list, no scroll needed */}
            <div className="py-1 max-h-[55vh] overflow-y-auto">
              <button onClick={() => select("")}
                className="w-full flex items-center justify-between px-4 py-3.5 text-[14px] text-gray-700 active:bg-gray-50">
                <span>{group.allLabel ?? "Të gjitha"}</span>
                {!hasValue && <Check size={16} className="text-brand-600" />}
              </button>
              <div className="h-px bg-gray-100 mx-4" />
              {group.options.map((opt) => (
                <button key={opt.value} onClick={() => select(opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-[14px] text-gray-700 active:bg-gray-50 border-b border-gray-50 last:border-0">
                  <span className={group.value === opt.value ? "font-semibold text-brand-700" : ""}>{opt.label}</span>
                  {group.value === opt.value && <Check size={16} className="text-brand-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface MobileFilterSheetProps {
  groups: FilterGroup[];
}

export function MobileFilterSheet({ groups }: MobileFilterSheetProps) {
  return (
    <>
      {groups.map((g) => (
        <SingleFilterChip key={g.key} group={g} />
      ))}
    </>
  );
}
