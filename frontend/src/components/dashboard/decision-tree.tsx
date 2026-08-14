"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentReport } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Pannable decision tree.
 *
 * SVG rather than WebGL: this is a diagram, not a scene, and SVG gives
 * crisp text at any zoom plus real hit targets for free. Drag to pan,
 * scroll or pinch to zoom, double-click to reset.
 */

type Node = {
  id: string;
  label: string;
  detail: string;
  score: number;
  x: number;
  y: number;
  kind: "root" | "desk" | "action";
};

function scoreColor(score: number) {
  if (score >= 85) return "#1d6f5f";
  if (score >= 70) return "#5b7ad6";
  if (score >= 50) return "#b7ca5d";
  return "#d45f3a";
}

export function DecisionTree({
  reports,
  goal,
  verdict,
  height = 460,
}: {
  reports: AgentReport[];
  goal: string;
  verdict?: string;
  height?: number;
}) {
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const drag = useRef<{ active: boolean; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, links } = useMemo(() => {
    const desks = reports.slice(0, 9);
    const result: Node[] = [
      { id: "root", label: goal.slice(0, 42), detail: verdict ?? "", score: 0, x: 0, y: 0, kind: "root" },
    ];
    const edges: { from: string; to: string; score: number }[] = [];

    const spread = 150;
    desks.forEach((report, index) => {
      const column = index - (desks.length - 1) / 2;
      const id = `desk-${index}`;

      result.push({
        id,
        label: report.agent,
        detail: report.title,
        score: report.score,
        x: column * spread,
        y: 190,
        kind: "desk",
      });
      edges.push({ from: "root", to: id, score: report.score });

      report.bullets.slice(0, 2).forEach((bullet, bulletIndex) => {
        const actionId = `${id}-a${bulletIndex}`;
        result.push({
          id: actionId,
          label: bullet.slice(0, 34),
          detail: bullet,
          score: report.score,
          x: column * spread + (bulletIndex - 0.5) * 62,
          y: 360 + bulletIndex * 68,
          kind: "action",
        });
        edges.push({ from: id, to: actionId, score: report.score });
      });
    });

    return { nodes: result, links: edges };
  }, [goal, reports, verdict]);

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  function onWheel(event: React.WheelEvent) {
    event.preventDefault();
    setView((current) => ({
      ...current,
      scale: Math.max(0.35, Math.min(2.2, current.scale - event.deltaY * 0.0012)),
    }));
  }

  if (!reports.length) return null;

  return (
    <div className="dt-wrap" style={{ height }}>
      <svg
        viewBox="-620 -80 1240 560"
        className="dt-svg"
        onWheel={onWheel}
        onPointerDown={(event) => {
          drag.current = { active: true, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          if (!drag.current?.active) return;
          const dx = event.clientX - drag.current.x;
          const dy = event.clientY - drag.current.y;
          drag.current.x = event.clientX;
          drag.current.y = event.clientY;
          setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onDoubleClick={() => setView({ x: 0, y: 0, scale: 1 })}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          {links.map((link) => {
            const from = byId.get(link.from);
            const to = byId.get(link.to);
            if (!from || !to) return null;

            const midY = (from.y + to.y) / 2;
            return (
              <path
                key={`${link.from}-${link.to}`}
                d={`M ${from.x} ${from.y + 26} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 22}`}
                className="dt-link"
                stroke={scoreColor(link.score)}
              />
            );
          })}

          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              className={cn("dt-node", selected === node.id && "dt-node-on")}
              onClick={() => setSelected(selected === node.id ? null : node.id)}
            >
              {node.kind === "root" ? (
                <>
                  <rect x={-140} y={-26} width={280} height={52} rx={10} className="dt-root" />
                  <text y={5} className="dt-root-label">
                    {node.label}
                  </text>
                </>
              ) : node.kind === "desk" ? (
                <>
                  <circle r={22} fill={scoreColor(node.score)} fillOpacity={0.9} />
                  <text y={4} className="dt-score">
                    {node.score}
                  </text>
                  <text y={40} className="dt-label">
                    {node.label}
                  </text>
                </>
              ) : (
                <>
                  <rect x={-64} y={-16} width={128} height={32} rx={7} className="dt-action" />
                  <text y={4} className="dt-action-label">
                    {node.label}
                  </text>
                </>
              )}
            </g>
          ))}
        </g>
      </svg>

      <div className="dt-controls">
        <button type="button" onClick={() => setView({ x: 0, y: 0, scale: 1 })} className="dt-btn">
          Reset
        </button>
        <span className="dt-hint">Drag to pan · scroll to zoom</span>
      </div>

      {selected ? (
        <div className="dt-detail">
          <p className="sec-eyebrow">{byId.get(selected)?.label}</p>
          <p className="dt-detail-body">{byId.get(selected)?.detail}</p>
        </div>
      ) : null}
    </div>
  );
}
