"use client";

import { useId, useMemo } from "react";
import { CHART_COLORS, ChartEmpty } from "@/components/charts/chart-kit";

export type FlowLink = { from: string; to: string; value: number };
export type BoxStats = { label: string; values: number[] };

function shade(hex: string, amount: number) {
  const clean = hex.replace("#", "");
  const parts = [0, 2, 4].map((offset) => {
    const channel = parseInt(clean.slice(offset, offset + 2), 16);
    return Math.max(0, Math.min(255, Math.round(channel + amount)));
  });
  return `#${parts.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function Treemap({
  points,
  height = 230,
}: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  const laid = useMemo(() => {
    const total = points.reduce((sum, p) => sum + p.value, 0);
    if (!total) return [];

    const sorted = [...points].sort((a, b) => b.value - a.value);
    const boxes: { label: string; value: number; x: number; y: number; w: number; h: number }[] = [];

    let x = 0;
    let y = 0;
    let remainingW = 100;
    let remainingH = 100;
    let remaining = total;
    let horizontal = true;

    sorted.forEach((point, index) => {
      const fraction = point.value / remaining;
      const isLast = index === sorted.length - 1;

      if (horizontal) {
        const w = isLast ? remainingW : remainingW * fraction;
        boxes.push({ ...point, x, y, w, h: remainingH });
        x += w;
        remainingW -= w;
      } else {
        const h = isLast ? remainingH : remainingH * fraction;
        boxes.push({ ...point, x, y, w: remainingW, h });
        y += h;
        remainingH -= h;
      }

      remaining -= point.value;
      horizontal = !horizontal;
    });

    return boxes;
  }, [points]);

  if (!laid.length) return <ChartEmpty />;

  return (
    <div className="chart-treemap" style={{ height }}>
      {laid.map((box, index) => (
        <div
          key={box.label}
          className="chart-tree-cell"
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
            background: `linear-gradient(145deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${shade(
              CHART_COLORS[index % CHART_COLORS.length],
              -34,
            )})`,
            animationDelay: `${index * 55}ms`,
          }}
          title={`${box.label}: ${box.value}`}
        >
          <span className="chart-tree-label">{box.label}</span>
          <span className="chart-tree-value">{box.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SankeyFlow({
  links,
  height = 240,
}: {
  links: FlowLink[];
  height?: number;
}) {
  const gradientId = useId();

  const model = useMemo(() => {
    const sources = Array.from(new Set(links.map((l) => l.from)));
    const targets = Array.from(new Set(links.map((l) => l.to)));
    const total = links.reduce((sum, l) => sum + l.value, 0);
    if (!total) return null;

    const sourceTotals = new Map(
      sources.map((name) => [name, links.filter((l) => l.from === name).reduce((s, l) => s + l.value, 0)]),
    );
    const targetTotals = new Map(
      targets.map((name) => [name, links.filter((l) => l.to === name).reduce((s, l) => s + l.value, 0)]),
    );

    const gap = 2;
    let sourceY = 0;
    const sourceNodes = sources.map((name) => {
      const value = sourceTotals.get(name) ?? 0;
      const h = (value / total) * (100 - gap * (sources.length - 1));
      const node = { name, y: sourceY, h, value };
      sourceY += h + gap;
      return node;
    });

    let targetY = 0;
    const targetNodes = targets.map((name) => {
      const value = targetTotals.get(name) ?? 0;
      const h = (value / total) * (100 - gap * (targets.length - 1));
      const node = { name, y: targetY, h, value };
      targetY += h + gap;
      return node;
    });

    const sourceCursor = new Map(sourceNodes.map((n) => [n.name, n.y]));
    const targetCursor = new Map(targetNodes.map((n) => [n.name, n.y]));

    const ribbons = links.map((link) => {
      const h = (link.value / total) * 100;
      const y0 = sourceCursor.get(link.from) ?? 0;
      const y1 = targetCursor.get(link.to) ?? 0;
      sourceCursor.set(link.from, y0 + h);
      targetCursor.set(link.to, y1 + h);
      return { ...link, y0, y1, h };
    });

    return { sourceNodes, targetNodes, ribbons };
  }, [links]);

  if (!model) return <ChartEmpty />;

  return (
    <div style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
        <defs>
          {model.ribbons.map((ribbon, index) => (
            <linearGradient key={index} id={`${gradientId}-${index}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity="0.55" />
              <stop offset="100%" stopColor={CHART_COLORS[(index + 3) % CHART_COLORS.length]} stopOpacity="0.3" />
            </linearGradient>
          ))}
        </defs>

        {model.ribbons.map((ribbon, index) => {
          const top = `M 14 ${ribbon.y0} C 45 ${ribbon.y0}, 55 ${ribbon.y1}, 86 ${ribbon.y1}`;
          const bottom = `L 86 ${ribbon.y1 + ribbon.h} C 55 ${ribbon.y1 + ribbon.h}, 45 ${ribbon.y0 + ribbon.h}, 14 ${ribbon.y0 + ribbon.h} Z`;
          return (
            <path
              key={index}
              d={`${top} ${bottom}`}
              fill={`url(#${gradientId}-${index})`}
              className="chart-ribbon"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <title>{`${ribbon.from} → ${ribbon.to}: ${ribbon.value}`}</title>
            </path>
          );
        })}

        {model.sourceNodes.map((node, index) => (
          <rect
            key={node.name}
            x="10"
            y={node.y}
            width="4"
            height={node.h}
            rx="1"
            fill={CHART_COLORS[index % CHART_COLORS.length]}
          />
        ))}

        {model.targetNodes.map((node, index) => (
          <rect
            key={node.name}
            x="86"
            y={node.y}
            width="4"
            height={node.h}
            rx="1"
            fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]}
          />
        ))}
      </svg>

      <div className="chart-flow-labels">
        <div>
          {model.sourceNodes.map((node) => (
            <span key={node.name}>{node.name}</span>
          ))}
        </div>
        <div className="text-right">
          {model.targetNodes.map((node) => (
            <span key={node.name}>{node.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BoxPlot({
  groups,
  height = 210,
  color = CHART_COLORS[0],
}: {
  groups: BoxStats[];
  height?: number;
  color?: string;
}) {
  const stats = useMemo(
    () =>
      groups
        .filter((group) => group.values.length)
        .map((group) => {
          const sorted = [...group.values].sort((a, b) => a - b);
          const at = (fraction: number) => sorted[Math.floor(fraction * (sorted.length - 1))];
          return {
            label: group.label,
            min: sorted[0],
            q1: at(0.25),
            median: at(0.5),
            q3: at(0.75),
            max: sorted[sorted.length - 1],
          };
        }),
    [groups],
  );

  if (!stats.length) return <ChartEmpty />;

  const max = Math.max(...stats.map((s) => s.max));
  const min = Math.min(...stats.map((s) => s.min));
  const span = Math.max(1, max - min);
  const y = (value: number) => 100 - ((value - min) / span) * 100;
  const step = 100 / stats.length;

  return (
    <div style={{ height }}>
      <svg viewBox="0 0 100 108" preserveAspectRatio="none" className="chart-svg">
        {stats.map((box, index) => {
          const cx = step * index + step / 2;
          const width = Math.min(11, step * 0.5);

          return (
            <g key={box.label} className="chart-box" style={{ animationDelay: `${index * 60}ms` }}>
              <line x1={cx} y1={y(box.min)} x2={cx} y2={y(box.max)} stroke={color} strokeWidth="0.5" opacity="0.5" />
              <line x1={cx - width / 3} y1={y(box.max)} x2={cx + width / 3} y2={y(box.max)} stroke={color} strokeWidth="0.6" />
              <line x1={cx - width / 3} y1={y(box.min)} x2={cx + width / 3} y2={y(box.min)} stroke={color} strokeWidth="0.6" />
              <rect
                x={cx - width / 2}
                y={y(box.q3)}
                width={width}
                height={Math.max(0.8, y(box.q1) - y(box.q3))}
                rx="1"
                fill={color}
                fillOpacity="0.28"
                stroke={color}
                strokeWidth="0.6"
              />
              <line x1={cx - width / 2} y1={y(box.median)} x2={cx + width / 2} y2={y(box.median)} stroke={color} strokeWidth="1.1" />
              <text x={cx} y="106" className="chart-box-label" textAnchor="middle">
                {box.label.length > 9 ? `${box.label.slice(0, 8)}…` : box.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function WaterfallChart({
  steps,
  height = 210,
}: {
  steps: { label: string; delta: number }[];
  height?: number;
}) {
  const model = useMemo(() => {
    let running = 0;
    const bars = steps.map((step) => {
      const start = running;
      running += step.delta;
      return { ...step, start, end: running };
    });
    const values = bars.flatMap((bar) => [bar.start, bar.end]);
    return { bars, max: Math.max(0, ...values), min: Math.min(0, ...values) };
  }, [steps]);

  if (!model.bars.length) return <ChartEmpty />;

  const span = Math.max(1, model.max - model.min);
  const y = (value: number) => 100 - ((value - model.min) / span) * 100;
  const step = 100 / model.bars.length;

  return (
    <div style={{ height }}>
      <svg viewBox="0 0 100 110" preserveAspectRatio="none" className="chart-svg">
        <line x1="0" y1={y(0)} x2="100" y2={y(0)} stroke="currentColor" strokeWidth="0.4" opacity="0.25" />

        {model.bars.map((bar, index) => {
          const cx = step * index + step / 2;
          const width = Math.min(12, step * 0.62);
          const top = y(Math.max(bar.start, bar.end));
          const barHeight = Math.max(1, Math.abs(y(bar.start) - y(bar.end)));
          const positive = bar.delta >= 0;

          return (
            <g key={bar.label} className="chart-waterfall-bar" style={{ animationDelay: `${index * 70}ms` }}>
              {index > 0 ? (
                <line
                  x1={step * (index - 1) + step / 2 + width / 2}
                  y1={y(bar.start)}
                  x2={cx - width / 2}
                  y2={y(bar.start)}
                  stroke="currentColor"
                  strokeWidth="0.35"
                  strokeDasharray="1.5 1.5"
                  opacity="0.35"
                />
              ) : null}

              <rect
                x={cx - width / 2}
                y={top}
                width={width}
                height={barHeight}
                rx="1"
                fill={positive ? CHART_COLORS[1] : CHART_COLORS[2]}
              />

              <text x={cx} y={top - 2} className="chart-box-label" textAnchor="middle">
                {bar.delta > 0 ? `+${bar.delta}` : bar.delta}
              </text>
              <text x={cx} y="108" className="chart-box-label" textAnchor="middle">
                {bar.label.length > 9 ? `${bar.label.slice(0, 8)}…` : bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function FunnelChart({
  stages,
  height = 220,
}: {
  stages: { label: string; value: number }[];
  height?: number;
}) {
  if (!stages.length) return <ChartEmpty />;
  const top = stages[0].value || 1;

  return (
    <div className="chart-funnel" style={{ minHeight: height }}>
      {stages.map((stage, index) => {
        const width = Math.max(12, (stage.value / top) * 100);
        const drop = index === 0 ? null : Math.round((1 - stage.value / stages[index - 1].value) * 100);

        return (
          <div key={stage.label} className="chart-funnel-row">
            <div
              className="chart-funnel-bar"
              style={{
                width: `${width}%`,
                background: `linear-gradient(90deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${shade(
                  CHART_COLORS[index % CHART_COLORS.length],
                  -30,
                )})`,
                animationDelay: `${index * 80}ms`,
              }}
            >
              <span className="chart-funnel-label">{stage.label}</span>
              <span className="chart-funnel-value">{stage.value}</span>
            </div>
            {drop !== null ? <span className="chart-funnel-drop">-{drop}%</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function BubbleChart({
  points,
  height = 230,
}: {
  points: { label: string; x: number; y: number; size: number }[];
  height?: number;
}) {
  if (!points.length) return <ChartEmpty />;

  const maxX = Math.max(...points.map((p) => p.x)) || 1;
  const maxY = Math.max(...points.map((p) => p.y)) || 1;
  const maxSize = Math.max(...points.map((p) => p.size)) || 1;

  return (
    <div style={{ height }}>
      <svg viewBox="-4 -4 108 108" className="chart-svg">
        {[0, 25, 50, 75, 100].map((line) => (
          <line key={line} x1="0" y1={line} x2="100" y2={line} className="chart-bubble-grid" />
        ))}

        {points.map((point, index) => (
          <circle
            key={point.label}
            cx={(point.x / maxX) * 100}
            cy={100 - (point.y / maxY) * 100}
            r={4 + (point.size / maxSize) * 9}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            fillOpacity="0.5"
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth="0.7"
            className="chart-bubble"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <title>{`${point.label} — ${point.x} / ${point.y} (${point.size})`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export function TimelineChart({
  items,
  height = 200,
}: {
  items: { label: string; start: number; end: number; color?: string }[];
  height?: number;
}) {
  if (!items.length) return <ChartEmpty />;

  const min = Math.min(...items.map((item) => item.start));
  const max = Math.max(...items.map((item) => item.end));
  const span = Math.max(1, max - min);

  return (
    <div className="chart-timeline" style={{ minHeight: height }}>
      {items.map((item, index) => (
        <div key={item.label} className="chart-timeline-row">
          <span className="chart-timeline-label">{item.label}</span>
          <span className="chart-timeline-track">
            <span
              className="chart-timeline-bar"
              style={{
                left: `${((item.start - min) / span) * 100}%`,
                width: `${Math.max(2, ((item.end - item.start) / span) * 100)}%`,
                background: item.color ?? CHART_COLORS[index % CHART_COLORS.length],
                animationDelay: `${index * 60}ms`,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

export function BulletChart({
  rows,
  height = 180,
}: {
  rows: { label: string; value: number; target: number; max: number }[];
  height?: number;
}) {
  if (!rows.length) return <ChartEmpty />;

  return (
    <div className="chart-bullets" style={{ minHeight: height }}>
      {rows.map((row, index) => (
        <div key={row.label} className="chart-bullet-row">
          <span className="chart-bullet-label">{row.label}</span>
          <span className="chart-bullet-track">
            <span
              className="chart-bullet-fill"
              style={{
                width: `${Math.min(100, (row.value / row.max) * 100)}%`,
                background: row.value >= row.target ? CHART_COLORS[1] : CHART_COLORS[2],
                animationDelay: `${index * 60}ms`,
              }}
            />
            <span className="chart-bullet-target" style={{ left: `${(row.target / row.max) * 100}%` }} />
          </span>
          <span className="chart-bullet-value">
            {row.value}
            <em>/{row.target}</em>
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProgressRings({
  rings,
  size = 190,
}: {
  rings: { label: string; value: number }[];
  size?: number;
}) {
  if (!rings.length) return <ChartEmpty />;

  return (
    <div className="chart-rings-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size}>
          {rings.slice(0, 4).map((ring, index) => {
            const radius = 42 - index * 11;
            const circumference = 2 * Math.PI * radius;
            const dash = (Math.min(100, ring.value) / 100) * circumference;

            return (
              <g key={ring.label}>
                <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="7" className="chart-ring-track" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeDasharray={`${dash} ${circumference}`}
                  className="chart-ring-arc"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="chart-legend">
        {rings.slice(0, 4).map((ring, index) => (
          <li key={ring.label}>
            <span className="chart-swatch" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
            <span className="chart-legend-label">{ring.label}</span>
            <span className="chart-legend-value">{ring.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StreamGraph({
  labels,
  series,
  height = 210,
}: {
  labels: string[];
  series: { name: string; values: number[] }[];
  height?: number;
}) {
  const gradientId = useId();
  if (!labels.length || !series.length) return <ChartEmpty />;

  const totals = labels.map((_, index) => series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const x = (index: number) => (labels.length === 1 ? 50 : (index / (labels.length - 1)) * 100);

  let baseline = labels.map((_, index) => 50 + (totals[index] / max) * 25);

  return (
    <div style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
        <defs>
          {series.map((s, index) => (
            <linearGradient key={s.name} id={`${gradientId}-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity="0.85" />
              <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity="0.45" />
            </linearGradient>
          ))}
        </defs>

        {series.map((s, seriesIndex) => {
          const tops = labels.map((_, index) => {
            const value = ((s.values[index] ?? 0) / max) * 50;
            const top = baseline[index] - value;
            return top;
          });

          const path = [
            ...tops.map((top, index) => `${index === 0 ? "M" : "L"}${x(index)},${top}`),
            ...baseline
              .map((base, index) => ({ base, index }))
              .reverse()
              .map(({ base, index }) => `L${x(index)},${base}`),
            "Z",
          ].join(" ");

          baseline = tops;

          return (
            <path
              key={s.name}
              d={path}
              fill={`url(#${gradientId}-${seriesIndex})`}
              className="chart-stream-band"
              style={{ animationDelay: `${seriesIndex * 90}ms` }}
            >
              <title>{s.name}</title>
            </path>
          );
        })}
      </svg>

      <div className="chart-xlabels">
        {labels.map((label) => (
          <span key={label} className="chart-xlabel">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
