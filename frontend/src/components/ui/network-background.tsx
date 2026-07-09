"use client";

import { useMemo } from "react";

type Node = { x: number; y: number; r: number; hub?: boolean; delay: number };
type Edge = { x1: number; y1: number; x2: number; y2: number; hub?: boolean };

const WIDTH = 1600;
const HEIGHT = 900;
const NODE_COUNT = 40;
const LINK_DISTANCE = WIDTH * 0.13;
const HUB_EVERY = 7;

function createRng(seed: number) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildNetwork() {
  const rand = createRng(90210);
  const nodes: Node[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
    x: rand() * WIDTH,
    y: rand() * HEIGHT,
    r: 2 + rand() * 2.2,
    hub: i % HUB_EVERY === 0,
    delay: rand() * 5,
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < LINK_DISTANCE) {
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, hub: a.hub || b.hub });
      }
    }
  }

  return { nodes, edges };
}

export function NetworkBackground() {
  const { nodes, edges } = useMemo(buildNetwork, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(circle_at_center,black,transparent_86%)]"
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-[0.5] dark:opacity-[0.65]"
      >
        <defs>
          <linearGradient id="net-line-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="rgb(var(--color-ink))" stopOpacity="0.5" />
          </linearGradient>
          <filter id="net-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g strokeWidth="1">
          {edges.map((edge, i) => (
            <line
              key={i}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={edge.hub ? "url(#net-line-grad)" : "rgb(var(--color-ink))"}
              strokeOpacity={edge.hub ? 1 : 0.18}
              strokeWidth={edge.hub ? 1.2 : 0.6}
            />
          ))}
        </g>

        <g>
          {nodes.map((node, i) => (
            <circle
              key={i}
              cx={node.x}
              cy={node.y}
              r={node.hub ? node.r * 1.8 : node.r}
              fill={node.hub ? "rgb(var(--color-accent))" : "rgb(var(--color-ink))"}
              fillOpacity={node.hub ? 0.95 : 0.4}
              filter={node.hub ? "url(#net-glow)" : undefined}
              className={node.hub ? "net-node-pulse" : undefined}
              style={node.hub ? { animationDelay: `${node.delay}s` } : undefined}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
