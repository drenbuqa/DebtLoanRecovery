"use client";

import { useState } from "react";

type Bucket = { label: string; key: string; calls: number; visits: number; other: number };

export function ActivityTrendChart({
  buckets,
  mode,
}: {
  buckets: Bucket[];
  mode: "day" | "week" | "month";
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 560; const H = 240;
  const PL = 36; const PR = 16; const PT = 24; const PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = buckets.length;

  if (n === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-gray-400">
        Nuk ka të dhëna për periudhën e zgjedhur
      </div>
    );
  }

  const maxCalls  = Math.max(...buckets.map((b) => b.calls), 1);
  const maxVisits = Math.max(...buckets.map((b) => b.visits), 1);
  const rawMax    = Math.max(maxCalls, maxVisits, 1);

  // Nice Y axis
  const roughStep = rawMax / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const norm = roughStep / mag;
  const niceMult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = niceMult * mag;
  const nTicks = Math.max(Math.ceil((rawMax * 1.1) / step), 2);
  const yMax = nTicks * step;
  const yTicks = Array.from({ length: nTicks }, (_, i) => step * (i + 1));

  const xPos = (i: number) => PL + (i / Math.max(n - 1, 1)) * chartW;
  const yPos = (v: number) => PT + chartH - (v / yMax) * chartH;

  const pointsPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`).join(" ");

  const areaPath = (vals: number[], color: string) => {
    const pts = vals.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(" L ");
    const last = xPos(vals.length - 1);
    const base = PT + chartH;
    return `M ${xPos(0).toFixed(1)},${base} L ${pts} L ${last.toFixed(1)},${base} Z`;
  };

  const callVals  = buckets.map((b) => b.calls);
  const visitVals = buckets.map((b) => b.visits);

  // Show every Nth label to avoid crowding
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : n <= 30 ? 4 : Math.ceil(n / 8);

  return (
    <div className="relative w-full select-none" style={{ userSelect: "none" }}
      onMouseLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="atCallFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="atVisitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b7280" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTicks.map((tick) => {
          const y = yPos(tick);
          return (
            <g key={tick}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="#d1d5db" fontFamily="system-ui">
                {tick}
              </text>
            </g>
          );
        })}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="#e5e7eb" strokeWidth={1} />

        {/* Hover column */}
        {hovered !== null && (
          <rect
            x={PL + (hovered / Math.max(n - 1, 1)) * chartW - 18}
            y={PT}
            width={36}
            height={chartH}
            fill="#f9fafb"
            rx={4}
          />
        )}

        {/* Area fills */}
        <path d={areaPath(callVals, "#7c3aed")} fill="url(#atCallFill)" />
        <path d={areaPath(visitVals, "#6b7280")} fill="url(#atVisitFill)" />

        {/* Lines */}
        <path d={pointsPath(visitVals)} fill="none" stroke="#9ca3af" strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round" />
        <path d={pointsPath(callVals)} fill="none" stroke="#7c3aed" strokeWidth={1.8}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points + hit areas */}
        {buckets.map((b, i) => {
          const cx = xPos(i); const callY = yPos(b.calls); const visitY = yPos(b.visits);
          const isHov = hovered === i;
          return (
            <g key={b.key}
              onMouseEnter={() => setHovered(i)}
              style={{ cursor: "pointer" }}>
              {/* Wide invisible hit area */}
              <rect
                x={PL + (i / Math.max(n - 1, 1)) * chartW - (chartW / Math.max(n - 1, 1)) / 2}
                y={PT} width={chartW / Math.max(n - 1, 1)} height={chartH + PB}
                fill="transparent"
              />
              {/* Call dot */}
              <circle cx={cx} cy={callY} r={isHov ? 4 : 2.5}
                fill="#7c3aed" stroke="white" strokeWidth={isHov ? 1.5 : 1}
                style={{ transition: "r 0.1s" }} />
              {/* Visit dot */}
              <circle cx={cx} cy={visitY} r={isHov ? 4 : 2.5}
                fill="#9ca3af" stroke="white" strokeWidth={isHov ? 1.5 : 1}
                style={{ transition: "r 0.1s" }} />
              {/* X label */}
              {i % labelEvery === 0 && (
                <text x={cx} y={PT + chartH + 17} textAnchor="middle" fontSize={9.5}
                  fill={isHov ? "#374151" : "#9ca3af"} fontFamily="system-ui"
                  fontWeight={isHov ? "600" : "400"}
                  style={{ transition: "fill 0.1s" }}>
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && buckets[hovered] && (() => {
        const b = buckets[hovered];
        const cx = xPos(hovered);
        const topY = Math.min(yPos(b.calls), yPos(b.visits));
        const leftPct = (cx / W) * 100;
        const topPct  = (topY / H) * 100;
        return (
          <div style={{ position: "absolute", top: `${topPct}%`, left: `${leftPct}%`,
            transform: "translate(-50%, -100%) translateY(-8px)", pointerEvents: "none", zIndex: 10 }}>
            <div className="bg-gray-900 border border-gray-800 text-white rounded-lg px-3 py-2 text-center whitespace-nowrap"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
              <div className="text-[10px] text-gray-400 mb-1">{b.label}</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-400 inline-block" />
                  <span className="text-[12px] font-semibold tabular">{b.calls}</span>
                  <span className="text-[10px] text-gray-400">tel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                  <span className="text-[12px] font-semibold tabular">{b.visits}</span>
                  <span className="text-[10px] text-gray-400">viz</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
