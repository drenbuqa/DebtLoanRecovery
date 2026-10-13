"use client";

import { useState, useRef } from "react";

const MONTHS = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];

function fmtAxis(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${v}`;
}

function fmtTooltip(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `€${(v / 1_000).toFixed(0)}k`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(1)}k`;
  return `€${v}`;
}

function computeYAxis(maxRaw: number): { max: number; ticks: number[] } {
  if (maxRaw <= 0) return { max: 1000, ticks: [250, 500, 750, 1000] };
  const roughStep = maxRaw / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / mag;
  let niceMult: number;
  if (norm <= 1) niceMult = 1;
  else if (norm <= 1.5) niceMult = 1.5;
  else if (norm <= 2) niceMult = 2;
  else if (norm <= 2.5) niceMult = 2.5;
  else if (norm <= 5) niceMult = 5;
  else niceMult = 10;
  const step = niceMult * mag;
  const nTicks = Math.ceil((maxRaw * 1.05) / step);
  const max = nTicks * step;
  const ticks = Array.from({ length: nTicks }, (_, i) => step * (i + 1));
  return { max, ticks };
}

export function CollectionsChart({
  data,
  currentMonth,
}: {
  data: { month: string; total: number }[];
  currentMonth: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const W = 600; const H = 340;
  const PL = 46; const PR = 16; const PT = 24; const PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = data.length;
  const colW = chartW / n;
  const barW = Math.max(Math.floor(colW * 0.52), 8);

  const maxRaw = Math.max(...data.map((d) => d.total), 1);
  const { max: mx, ticks: yTicks } = computeYAxis(maxRaw);

  const nowMonth = new Date().toISOString().slice(0, 7);

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="ccGradCur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="ccGradPast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#ede9fe" />
          </linearGradient>
          <linearGradient id="ccGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="ccGradPastHov" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#ddd6fe" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = PT + chartH * (1 - tick / mx);
          return (
            <g key={tick}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PL - 6} y={y + 3.5} textAnchor="end" fontSize={9} fill="#d1d5db" fontFamily="system-ui">
                {fmtAxis(tick)}
              </text>
            </g>
          );
        })}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="#e5e7eb" strokeWidth={1} />

        {data.map((d, i) => {
          const mo = d.month.split("-")[1];
          const label = MONTHS[parseInt(mo) - 1];
          const isCurrent = d.month === currentMonth;
          const isFuture = d.month > nowMonth;
          const isHov = hovered === i;
          const hasData = d.total > 0;
          const cx = PL + colW * i + colW / 2;
          const x = cx - barW / 2;
          const barH = hasData ? Math.max((d.total / mx) * chartH, 3) : 0;
          const y = PT + chartH - barH;

          let fill = isFuture ? "#f9fafb" : hasData ? "url(#ccGradPast)" : "#f3f4f6";
          if (isCurrent) fill = "url(#ccGradCur)";
          if (isHov && hasData && !isCurrent) fill = "url(#ccGradPastHov)";
          if (isHov && isCurrent) fill = "url(#ccGradHover)";

          return (
            <g key={d.month}
              onMouseEnter={() => !isFuture && setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: hasData && !isFuture ? "pointer" : "default" }}>
              <rect x={PL + colW * i} y={PT} width={colW} height={chartH + PB} fill="transparent" />
              {(hasData || !isFuture) && (
                <rect x={x} y={hasData ? y : PT + chartH - 2} width={barW}
                  height={hasData ? barH : 2} rx={hasData ? 3 : 1} fill={fill}
                  style={{ transition: "fill 0.12s ease" }} />
              )}
              <text x={cx} y={PT + chartH + 17} textAnchor="middle" fontSize={10}
                fontWeight={isCurrent ? "600" : "400"}
                fill={isCurrent ? "#6d28d9" : isHov ? "#4b5563" : "#9ca3af"}
                fontFamily="system-ui" style={{ transition: "fill 0.1s" }}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && data[hovered] && (() => {
        const d = data[hovered];
        const hasData = d.total > 0;
        const isCurrent = d.month === currentMonth;
        const barH = hasData ? Math.max((d.total / mx) * chartH, 3) : 0;
        const barTop = PT + chartH - barH;
        const leftPct = ((PL + colW * hovered + colW / 2) / W) * 100;
        const topPct = (barTop / H) * 100;
        return (
          <div style={{ position: "absolute", top: `${topPct}%`, left: `${leftPct}%`, transform: "translate(-50%, -100%) translateY(-6px)", pointerEvents: "none", zIndex: 10 }}>
            <div className={`px-2.5 py-1 rounded-lg border text-center whitespace-nowrap ${isCurrent ? "bg-brand-600 border-brand-500 text-white" : "bg-gray-900 border-gray-800 text-white"}`}
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
              <div className="text-[12px] font-bold tabular">{hasData ? fmtTooltip(d.total) : "Nuk ka të dhëna"}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
