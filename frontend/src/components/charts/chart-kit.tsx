"use client";

import { ReactNode, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type Point = { label: string; value: number };
export type Series = { name: string; color: string; points: Point[] };

export const CHART_COLORS = [
  "#5b7ad6",
  "#1d6f5f",
  "#d45f3a",
  "#b7ca5d",
  "#9b6bd0",
  "#47a8c6",
  "#d9a441",
  "#c96a9a",
];

export function ChartFrame({
  title,
  hint,
  children,
  actions,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("chart-frame", className)}>
      <figcaption className="chart-head">
        <div className="min-w-0">
          <p className="chart-title">{title}</p>
          {hint ? <p className="chart-hint">{hint}</p> : null}
        </div>
        {actions}
      </figcaption>
      <div className="chart-body">{children}</div>
    </figure>
  );
}

function niceMax(value: number) {
  if (value <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / magnitude) * magnitude;
}

function Grid({ rows = 4, max }: { rows?: number; max: number }) {
  return (
    <g className="chart-grid">
      {Array.from({ length: rows + 1 }).map((_, index) => {
        const y = (index / rows) * 100;
        return (
          <g key={index}>
            <line x1="0" y1={y} x2="100" y2={y} vectorEffect="non-scaling-stroke" />
            <text x="-1.5" y={y + 1.2} className="chart-axis" textAnchor="end">
              {Math.round(max - (index / rows) * max)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function LineChart({
  series,
  height = 190,
  area = false,
  showDots = true,
}: {
  series: Series[];
  height?: number;
  area?: boolean;
  showDots?: boolean;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const max = useMemo(
    () => niceMax(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)))),
    [series],
  );

  const count = series[0]?.points.length ?? 0;
  if (!count) return <ChartEmpty />;

  const x = (index: number) => (count === 1 ? 50 : (index / (count - 1)) * 100);
  const y = (value: number) => 100 - (value / max) * 100;

  return (
    <div className="chart-scroll" style={{ height }}>
      <svg viewBox="-8 -6 116 118" preserveAspectRatio="none" className="chart-svg">
        <Grid max={max} />

        {series.map((s, seriesIndex) => {
          const path = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");

          return (
            <g key={s.name}>
              {area ? (
                <>
                  <defs>
                    <linearGradient id={`${gradientId}-${seriesIndex}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${path} L100,100 L0,100 Z`} fill={`url(#${gradientId}-${seriesIndex})`} />
                </>
              ) : null}

              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {showDots
                ? s.points.map((p, i) => (
                    <circle
                      key={p.label}
                      cx={x(i)}
                      cy={y(p.value)}
                      r={hover === i ? 3.2 : 2}
                      fill={s.color}
                      className="chart-dot"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))
                : null}
            </g>
          );
        })}

        {series[0].points.map((p, i) => (
          <rect
            key={p.label}
            x={x(i) - 100 / (count * 2)}
            y="0"
            width={100 / count}
            height="100"
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      <div className="chart-xlabels">
        {series[0].points.map((p, i) => (
          <span key={p.label} className={cn("chart-xlabel", hover === i && "chart-xlabel-on")}>
            {p.label}
          </span>
        ))}
      </div>

      {hover !== null ? (
        <div className="chart-readout">
          <span className="chart-readout-label">{series[0].points[hover].label}</span>
          {series.map((s) => (
            <span key={s.name} className="chart-readout-item">
              <span className="chart-swatch" style={{ background: s.color }} />
              {s.name}
              <strong>{s.points[hover]?.value ?? 0}</strong>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BarChart({
  points,
  height = 190,
  color = CHART_COLORS[0],
  horizontal = false,
}: {
  points: Point[];
  height?: number;
  color?: string;
  horizontal?: boolean;
}) {
  const max = useMemo(() => niceMax(Math.max(1, ...points.map((p) => p.value))), [points]);
  if (!points.length) return <ChartEmpty />;

  if (horizontal) {
    return (
      <div className="chart-hbars" style={{ minHeight: height }}>
        {points.map((p, index) => (
          <div key={p.label} className="chart-hbar-row">
            <span className="chart-hbar-label">{p.label}</span>
            <span className="chart-hbar-track">
              <span
                className="chart-hbar-fill"
                style={{
                  width: `${(p.value / max) * 100}%`,
                  background: color,
                  animationDelay: `${index * 50}ms`,
                }}
              />
            </span>
            <span className="chart-hbar-value">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="chart-scroll" style={{ height }}>
      <div className="chart-vbars">
        {points.map((p, index) => (
          <div key={p.label} className="chart-vbar-col" title={`${p.label}: ${p.value}`}>
            <span className="chart-vbar-value">{p.value}</span>
            <span
              className="chart-vbar"
              style={{
                height: `${(p.value / max) * 100}%`,
                background: color,
                animationDelay: `${index * 45}ms`,
              }}
            />
            <span className="chart-vbar-label">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedBarChart({
  labels,
  series,
  height = 190,
}: {
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
}) {
  const totals = labels.map((_, index) =>
    series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0),
  );
  const max = niceMax(Math.max(1, ...totals));

  if (!labels.length) return <ChartEmpty />;

  return (
    <div className="chart-scroll" style={{ height }}>
      <div className="chart-vbars">
        {labels.map((label, index) => (
          <div key={label} className="chart-vbar-col">
            <span className="chart-vbar-value">{totals[index]}</span>
            <span className="chart-stack" style={{ height: `${(totals[index] / max) * 100}%` }}>
              {series.map((s) => {
                const value = s.values[index] ?? 0;
                if (!value) return null;
                return (
                  <span
                    key={s.name}
                    className="chart-stack-part"
                    style={{
                      height: `${(value / Math.max(1, totals[index])) * 100}%`,
                      background: s.color,
                    }}
                    title={`${s.name}: ${value}`}
                  />
                );
              })}
            </span>
            <span className="chart-vbar-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  points,
  size = 170,
  centerLabel,
  centerValue,
}: {
  points: Point[];
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = points.reduce((sum, p) => sum + p.value, 0);
  if (!total) return <ChartEmpty />;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="chart-donut-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size}>
          {points.map((p, index) => {
            const fraction = p.value / total;
            const dash = fraction * circumference;
            const element = (
              <circle
                key={p.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth="11"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="chart-donut-arc"
              />
            );
            offset += dash;
            return element;
          })}
        </svg>

        <div className="chart-donut-center">
          <span className="chart-donut-value">{centerValue ?? total}</span>
          {centerLabel ? <span className="chart-donut-label">{centerLabel}</span> : null}
        </div>
      </div>

      <ul className="chart-legend">
        {points.map((p, index) => (
          <li key={p.label}>
            <span className="chart-swatch" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
            <span className="chart-legend-label">{p.label}</span>
            <span className="chart-legend-value">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RadarChart({
  points,
  size = 210,
  color = CHART_COLORS[0],
}: {
  points: Point[];
  size?: number;
  color?: string;
}) {
  if (points.length < 3) return <ChartEmpty />;

  const max = 100;
  const angle = (index: number) => (index / points.length) * 2 * Math.PI - Math.PI / 2;
  const coord = (index: number, value: number) => {
    const r = (value / max) * 38;
    return [50 + Math.cos(angle(index)) * r, 50 + Math.sin(angle(index)) * r];
  };

  const path = points
    .map((p, i) => {
      const [x, y] = coord(i, p.value);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-radar-wrap">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <polygon
            key={ring}
            points={points
              .map((_, i) => {
                const [x, y] = coord(i, max * ring);
                return `${x},${y}`;
              })
              .join(" ")}
            className="chart-radar-ring"
          />
        ))}

        {points.map((_, i) => {
          const [x, y] = coord(i, max);
          return <line key={i} x1="50" y1="50" x2={x} y2={y} className="chart-radar-spoke" />;
        })}

        <path d={`${path} Z`} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />

        {points.map((p, i) => {
          const [x, y] = coord(i, p.value);
          return <circle key={p.label} cx={x} cy={y} r="1.8" fill={color} />;
        })}

        {points.map((p, i) => {
          const [x, y] = coord(i, max + 16);
          return (
            <text key={p.label} x={x} y={y} className="chart-radar-label" textAnchor="middle">
              {p.label.length > 11 ? `${p.label.slice(0, 10)}…` : p.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function Heatmap({
  weeks,
  color = CHART_COLORS[1],
}: {
  weeks: { day: string; value: number }[][];
  color?: string;
}) {
  const max = Math.max(1, ...weeks.flat().map((cell) => cell.value));
  if (!weeks.length) return <ChartEmpty />;

  return (
    <div className="chart-heatmap">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="chart-heat-col">
          {week.map((cell, dayIndex) => (
            <span
              key={`${weekIndex}-${dayIndex}`}
              className="chart-heat-cell"
              title={`${cell.day}: ${cell.value}`}
              style={{
                background: cell.value
                  ? color
                  : undefined,
                opacity: cell.value ? 0.2 + (cell.value / max) * 0.8 : undefined,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ScatterPlot({
  points,
  height = 200,
  xLabel,
  yLabel,
}: {
  points: { x: number; y: number; label: string; color?: string }[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
}) {
  if (!points.length) return <ChartEmpty />;

  const maxX = niceMax(Math.max(...points.map((p) => p.x)));
  const maxY = niceMax(Math.max(...points.map((p) => p.y)));

  return (
    <div className="chart-scroll" style={{ height }}>
      <svg viewBox="-8 -6 116 118" className="chart-svg">
        <Grid max={maxY} />

        {points.map((p, index) => (
          <circle
            key={p.label}
            cx={(p.x / maxX) * 100}
            cy={100 - (p.y / maxY) * 100}
            r="2.6"
            fill={p.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            fillOpacity="0.85"
            className="chart-scatter-dot"
          >
            <title>{`${p.label}: ${p.x}, ${p.y}`}</title>
          </circle>
        ))}
      </svg>

      {xLabel || yLabel ? (
        <div className="chart-axis-labels">
          <span>{yLabel}</span>
          <span>{xLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export function Histogram({
  values,
  buckets = 8,
  color = CHART_COLORS[4],
  height = 170,
}: {
  values: number[];
  buckets?: number;
  color?: string;
  height?: number;
}) {
  const points = useMemo(() => {
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const width = span / buckets;

    return Array.from({ length: buckets }).map((_, index) => {
      const low = min + index * width;
      const high = low + width;
      const count = values.filter((v) => (index === buckets - 1 ? v <= high : v < high) && v >= low).length;
      return { label: `${Math.round(low)}`, value: count };
    });
  }, [values, buckets]);

  if (!points.length) return <ChartEmpty />;
  return <BarChart points={points} color={color} height={height} />;
}

export function GaugeChart({
  value,
  max = 100,
  size = 160,
  label,
  color = CHART_COLORS[0],
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const fraction = Math.max(0, Math.min(1, value / max));
  const radius = 40;
  const arc = Math.PI * radius;
  const dash = fraction * arc;

  return (
    <div className="chart-gauge" style={{ width: size }}>
      <svg viewBox="0 0 100 58" width={size}>
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className="chart-gauge-track"
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${arc}`}
          className="chart-gauge-fill"
        />
      </svg>
      <div className="chart-gauge-center">
        <span className="chart-gauge-value">{value}</span>
        {label ? <span className="chart-gauge-label">{label}</span> : null}
      </div>
    </div>
  );
}

export function ChartEmpty() {
  return <div className="chart-empty">Not enough data yet.</div>;
}
