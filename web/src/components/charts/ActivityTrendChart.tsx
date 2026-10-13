"use client";

import { useState, useCallback } from "react";

type Bucket = { label: string; key: string; calls: number; visits: number; other: number };

// Monotone cubic spline through points — smooth, no overshooting
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`;
  if (pts.length === 2) return `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]}`;

  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 5;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 5;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 5;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 5;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function smoothArea(pts: [number, number][], baseY: number): string {
  if (pts.length === 0) return "";
  const line = smoothPath(pts);
  // Walk from first point down to baseline, across, back up to start
  return (
    `M ${pts[0][0].toFixed(1)},${baseY.toFixed(1)} ` +
    `L ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} ` +
    line.replace(/^M [^ ]+ [^ ]+/, "") +   // strip the M from line, use L
    ` L ${pts[pts.length - 1][0].toFixed(1)},${baseY.toFixed(1)} Z`
  );
}

export function ActivityTrendChart({
  buckets,
  mode,
}: {
  buckets: Bucket[];
  mode: "day" | "week" | "month";
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Dimensions
  const W = 560; const H = 220;
  const PL = 40; const PR = 16; const PT = 20; const PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const baseY = PT + chartH;
  const n = buckets.length;

  const onMouseLeave = useCallback(() => setHovered(null), []);

  if (n === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-gray-400">
        Nuk ka të dhëna për periudhën e zgjedhur
      </div>
    );
  }

  const totals = buckets.map((b) => b.calls + b.visits);
  const rawMax = Math.max(...totals, 1);

  // Nice Y axis
  const roughStep = rawMax / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const norm = roughStep / mag;
  const niceMult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = niceMult * mag;
  const nTicks = Math.max(Math.ceil((rawMax * 1.15) / step), 2);
  const yMax = nTicks * step;
  const yTicks = Array.from({ length: nTicks }, (_, i) => step * (i + 1));

  const xPos = (i: number) => PL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yPos = (v: number) => PT + chartH - (v / yMax) * chartH;

  const pts: [number, number][] = totals.map((v, i) => [xPos(i), yPos(v)]);

  // Show every Nth label
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : n <= 31 ? 4 : Math.ceil(n / 8);

  return (
    <div
      className="relative w-full select-none"
      style={{ userSelect: "none" }}
      onMouseLeave={onMouseLeave}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Main line gradient fill */}
          <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
            <stop offset="75%" stopColor="#7c3aed" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          {/* Glow filter for the line */}
          <filter id="lineGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick) => {
          const y = yPos(tick);
          return (
            <g key={tick}>
              <line
                x1={PL} y1={y} x2={W - PR} y2={y}
                stroke="#f1f5f9" strokeWidth={1}
              />
              <text
                x={PL - 7} y={y + 4}
                textAnchor="end" fontSize={9.5} fill="#cbd5e1"
                fontFamily="system-ui" fontWeight="500"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(tick % 1000 === 0 ? 0 : 1)}k` : tick}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={PL} y1={baseY} x2={W - PR} y2={baseY} stroke="#e2e8f0" strokeWidth={1} />

        {/* Area fill */}
        <path d={smoothArea(pts, baseY)} fill="url(#actFill)" />

        {/* Hover vertical rule */}
        {hovered !== null && (
          <line
            x1={pts[hovered][0]} y1={PT}
            x2={pts[hovered][0]} y2={baseY}
            stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="3 3"
          />
        )}

        {/* Main smooth line */}
        <path
          d={smoothPath(pts)}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots — small static, enlarged on hover */}
        {pts.map(([cx, cy], i) => {
          const isHov = hovered === i;
          return (
            <circle
              key={i}
              cx={cx} cy={cy}
              r={isHov ? 5 : 2.5}
              fill={isHov ? "#7c3aed" : "white"}
              stroke="#7c3aed"
              strokeWidth={isHov ? 2 : 1.5}
              style={{ transition: "r 0.12s ease, fill 0.12s ease" }}
            />
          );
        })}

        {/* X-axis labels + invisible wide hit areas */}
        {buckets.map((b, i) => {
          const cx = pts[i][0];
          const segW = n > 1 ? chartW / (n - 1) : chartW;
          return (
            <g
              key={b.key}
              onMouseEnter={() => setHovered(i)}
              style={{ cursor: "default" }}
            >
              <rect
                x={cx - segW / 2} y={PT}
                width={segW} height={chartH + PB}
                fill="transparent"
              />
              {i % labelEvery === 0 && (
                <text
                  x={cx} y={baseY + 18}
                  textAnchor="middle" fontSize={9.5}
                  fill={hovered === i ? "#6d28d9" : "#94a3b8"}
                  fontFamily="system-ui"
                  fontWeight={hovered === i ? "600" : "400"}
                  style={{ transition: "fill 0.1s" }}
                >
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {hovered !== null && (() => {
        const b    = buckets[hovered];
        const total = b.calls + b.visits;
        const [cx, cy] = pts[hovered];
        // Flip tooltip to the left when near right edge
        const nearRight = cx / W > 0.72;
        return (
          <div
            style={{
              position: "absolute",
              top:  `${((cy - 4) / H) * 100}%`,
              left: nearRight ? "auto" : `${(cx / W) * 100}%`,
              right: nearRight ? `${((W - cx) / W) * 100}%` : "auto",
              transform: nearRight
                ? "translateY(-100%) translateY(-10px)"
                : "translate(-50%, -100%) translateY(-10px)",
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            <div
              className="rounded-xl px-3.5 py-2.5 text-center whitespace-nowrap"
              style={{
                background: "rgba(15,15,25,0.9)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-[10px] text-slate-400 mb-1.5 font-medium">{b.label}</div>
              {/* Total */}
              <div className="text-[22px] font-bold text-white tabular leading-none mb-2">{total}</div>
              {/* Breakdown */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  <span className="text-[11px] text-slate-300 tabular">{b.calls}</span>
                  <span className="text-[10px] text-slate-500">tel</span>
                </div>
                <div className="w-px h-3 bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                  <span className="text-[11px] text-slate-300 tabular">{b.visits}</span>
                  <span className="text-[10px] text-slate-500">viz</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
