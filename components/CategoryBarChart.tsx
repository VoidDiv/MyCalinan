"use client";

import React from "react";

/* ============================================================
   CategoryBarChart — a grouped bar chart (pure SVG, no library).

   One group of bars per category, one bar per series.
   Example:
     <CategoryBarChart
       categories={["General", "Event"]}
       series={[
         { label: "Announcements", color: "#1a5c38", values: [3, 1] },
         { label: "Events & Festivals", color: "#d99b34", values: [2, 4] },
       ]}
     />
   ============================================================ */

export interface BarSeries {
  label: string;
  color: string;
  values: number[]; // one number per category, in the same order
}

interface Props {
  categories: readonly string[];
  series: BarSeries[];
}

/* Chart size (the SVG scales to fit its box, so these are just proportions) */
const W = 640;
const H = 300;
const M = { top: 26, right: 16, bottom: 44, left: 42 };
const INNER_W = W - M.left - M.right;
const INNER_H = H - M.top - M.bottom;
const TICKS = 4;

/* Pick a friendly step (1, 2, 5, 10, 25 …) so the side numbers are whole numbers */
function niceStep(maxValue: number): number {
  const raw = Math.max(1, Math.ceil(maxValue / TICKS));
  const steps = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return steps.find((s) => s >= raw) ?? raw;
}

export default function CategoryBarChart({ categories, series }: Props) {
  const maxValue = Math.max(0, ...series.flatMap((s) => s.values));
  const step = niceStep(maxValue);
  const top = step * TICKS;

  const slot = INNER_W / categories.length;
  const barGap = 6;
  const barW = Math.min(38, (slot - 28 - barGap * (series.length - 1)) / series.length);
  const groupW = barW * series.length + barGap * (series.length - 1);

  const yFor = (value: number) => M.top + INNER_H - (value / top) * INNER_H;
  const baseline = M.top + INNER_H;

  const summary = categories
    .map((c, i) => `${c}: ${series.map((s) => `${s.label} ${s.values[i] ?? 0}`).join(", ")}`)
    .join("; ");

  return (
    <div className="cbc-root">
      <style>{`
        .cbc-legend { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 0 0 12px; font-size: .82rem; color: #333; }
        .cbc-legend span { display: inline-flex; align-items: center; gap: 7px; }
        .cbc-swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .cbc-scroll { overflow-x: auto; }
        .cbc-svg { display: block; width: 100%; min-width: 480px; height: auto; }
        .cbc-bar {
          transform-box: fill-box; transform-origin: 50% 100%;
          animation: cbc-grow .6s ease both;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        @keyframes cbc-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) { .cbc-bar { animation: none; } }
      `}</style>

      <div className="cbc-legend" aria-hidden="true">
        {series.map((s) => (
          <span key={s.label}>
            <i className="cbc-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="cbc-scroll">
        <svg
          className="cbc-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Bar chart by category. ${summary}`}
          fontFamily="inherit"
        >
          {/* Horizontal grid lines + the numbers down the left side */}
          {Array.from({ length: TICKS + 1 }, (_, t) => {
            const value = t * step;
            const y = yFor(value);
            return (
              <g key={t}>
                <line
                  x1={M.left}
                  x2={W - M.right}
                  y1={y}
                  y2={y}
                  stroke={t === 0 ? "#b9c9bf" : "#e3ece6"}
                  strokeWidth={t === 0 ? 1.5 : 1}
                />
                <text x={M.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#778">
                  {value}
                </text>
              </g>
            );
          })}

          {/* One group of bars per category */}
          {categories.map((cat, i) => {
            const groupX = M.left + slot * i + (slot - groupW) / 2;
            return (
              <g key={cat}>
                {series.map((s, k) => {
                  const value = s.values[i] ?? 0;
                  const x = groupX + k * (barW + barGap);
                  const rawH = (value / top) * INNER_H;
                  const h = value > 0 ? Math.max(rawH, 2) : 0; // tiny values stay visible
                  return (
                    <g key={s.label}>
                      {h > 0 && (
                        <rect
                          className="cbc-bar"
                          x={x}
                          y={baseline - h}
                          width={barW}
                          height={h}
                          rx={4}
                          fill={s.color}
                        >
                          <title>{`${cat} — ${s.label}: ${value}`}</title>
                        </rect>
                      )}
                      <text
                        x={x + barW / 2}
                        y={baseline - h - 6}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="600"
                        fill={value > 0 ? "#1a3d28" : "#aab5ae"}
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                <text
                  x={M.left + slot * i + slot / 2}
                  y={baseline + 24}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#333"
                >
                  {cat}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}