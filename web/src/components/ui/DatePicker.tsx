"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from "lucide-react";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTHS_SHORT = ["Jan","Shk","Mar","Pri","Maj","Qer","Kor","Gus","Sht","Tet","Nën","Dhj"];
const MONTHS_FULL  = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];
const DAYS = ["Hë","Ma","Më","En","Pr","Sh","Di"];

type View = "day" | "month" | "year";

function parseDate(val: string): Date | null {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(val: string): string {
  const d = parseDate(val);
  if (!d) return "";
  return d.toLocaleDateString("sq-AL", { day: "2-digit", month: "long", year: "numeric" });
}

function toValue(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Build a decade block starting from a rounded base
function decadeStart(year: number) { return Math.floor(year / 10) * 10; }

export function DatePicker({ value, onChange, placeholder = "Select date", className = "", disabled = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("day");
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);      // trigger wrapper
  const panelRef = useRef<HTMLDivElement>(null); // portal panel
  const today = new Date();
  const selected = parseDate(value);

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      // Close only if the click is outside BOTH the trigger and the portal panel
      if (
        ref.current && !ref.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
        setView("day");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handler);
      function onScroll() {
        if (ref.current) updatePanelStyle(ref.current.getBoundingClientRect());
      }
      window.addEventListener("scroll", onScroll, true);
      return () => {
        document.removeEventListener("mousedown", handler);
        window.removeEventListener("scroll", onScroll, true);
      };
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function updatePanelStyle(rect: DOMRect) {
    const panelH = 310;
    const goUp = rect.bottom + panelH > window.innerHeight;
    setPanelStyle({
      position: "fixed",
      zIndex: 9999,
      width: 256,
      left: Math.min(rect.left, window.innerWidth - 264),
      ...(goUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }

  function openCalendar() {
    if (disabled) return;
    const s = parseDate(value);
    setViewYear(s?.getFullYear() ?? today.getFullYear());
    setViewMonth(s?.getMonth() ?? today.getMonth());
    setView("day");
    if (ref.current) updatePanelStyle(ref.current.getBoundingClientRect());
    setOpen(true);
  }

  function close() { setOpen(false); setView("day"); }

  // ── Day view helpers ────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function pickDay(day: number) {
    onChange(toValue(viewYear, viewMonth, day));
    close();
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const dayCells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (dayCells.length % 7 !== 0) dayCells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (d: number) =>
    !!selected && d === selected.getDate() && viewMonth === selected.getMonth() && viewYear === selected.getFullYear();

  // ── Month view ──────────────────────────────────────────────
  function pickMonth(m: number) {
    setViewMonth(m);
    setView("day");
  }

  // ── Year view ──────────────────────────────────────────────
  const ds = decadeStart(viewYear);
  // Show 12 years: ds-1 … ds+10 (one before and one after the decade for context)
  const yearRange = Array.from({ length: 12 }, (_, i) => ds - 1 + i);

  function pickYear(y: number) {
    setViewYear(y);
    setView("month");
  }

  function prevDecade() { setViewYear(y => y - 10); }
  function nextDecade() { setViewYear(y => y + 10); }
  function prevYear() { setViewYear(y => y - 1); }
  function nextYear() { setViewYear(y => y + 1); }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={openCalendar}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] rounded-lg border transition-all text-left
          ${open
            ? "border-brand-400 shadow-[0_0_0_3px_rgba(167,139,250,0.15)] bg-white"
            : "border-gray-200 bg-white hover:border-gray-300"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarDays size={13} className="text-gray-400 shrink-0" />
      </button>

      {/* Dropdown — rendered in a portal so it escapes modal overflow clipping */}
      {open && typeof document !== "undefined" && createPortal(
        <div ref={panelRef} style={panelStyle} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-3">

          {/* ── DAY VIEW ── */}
          {view === "day" && (
            <>
              {/* Nav */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevMonth}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setView("month")}
                  className="flex items-center gap-1 text-[13px] font-semibold text-gray-800 hover:text-brand-700 transition-colors px-1 py-0.5 rounded-md hover:bg-gray-50"
                >
                  {MONTHS_FULL[viewMonth]} {viewYear}
                  <ChevronDown size={11} className="text-gray-400" />
                </button>
                <button type="button" onClick={nextMonth}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {dayCells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const sel = isSelected(day);
                  const tod = isToday(day);
                  return (
                    <button key={i} type="button" onClick={() => pickDay(day)}
                      className={`w-full aspect-square flex items-center justify-center text-[12px] rounded-lg transition-colors
                        ${sel
                          ? "bg-brand-600 text-white font-semibold"
                          : tod
                          ? "text-brand-700 font-semibold bg-brand-50 hover:bg-brand-100"
                          : "text-gray-700 hover:bg-gray-100"
                        }`}>
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-between items-center">
                <button type="button" onClick={() => {
                  onChange(toValue(today.getFullYear(), today.getMonth(), today.getDate()));
                  close();
                }} className="text-[12px] text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  Sot
                </button>
                {value && (
                  <button type="button" onClick={() => { onChange(""); close(); }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                    Pastro
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── MONTH VIEW ── */}
          {view === "month" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevYear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setView("year")}
                  className="flex items-center gap-1 text-[13px] font-semibold text-gray-800 hover:text-brand-700 transition-colors px-1 py-0.5 rounded-md hover:bg-gray-50"
                >
                  {viewYear}
                  <ChevronDown size={11} className="text-gray-400" />
                </button>
                <button type="button" onClick={nextYear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_SHORT.map((m, i) => {
                  const isCurrent = selected && i === selected.getMonth() && viewYear === selected.getFullYear();
                  const isThisMonth = i === today.getMonth() && viewYear === today.getFullYear();
                  return (
                    <button key={m} type="button" onClick={() => pickMonth(i)}
                      className={`py-2 rounded-lg text-[12px] font-medium transition-colors
                        ${isCurrent
                          ? "bg-brand-600 text-white"
                          : isThisMonth
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-100"
                        }`}>
                      {m}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── YEAR VIEW ── */}
          {view === "year" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevDecade}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[13px] font-semibold text-gray-800">
                  {ds} – {ds + 9}
                </span>
                <button type="button" onClick={nextDecade}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {yearRange.map(y => {
                  const isSelectedYear = selected && y === selected.getFullYear();
                  const isThisYear = y === today.getFullYear();
                  const outOfDecade = y < ds || y > ds + 9;
                  return (
                    <button key={y} type="button" onClick={() => pickYear(y)}
                      className={`py-2 rounded-lg text-[12px] font-medium transition-colors
                        ${isSelectedYear
                          ? "bg-brand-600 text-white"
                          : isThisYear
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : outOfDecade
                          ? "text-gray-300 hover:bg-gray-50"
                          : "text-gray-700 hover:bg-gray-100"
                        }`}>
                      {y}
                    </button>
                  );
                })}
              </div>
            </>
          )}

        </div>,
        document.body
      )}
    </div>
  );
}
