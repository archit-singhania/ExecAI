"use client";
import { useCallback, useEffect, useState } from "react";
import { studioRequest } from "@/lib/studio";

type Node = {
  id: string;
  kind: string;
  title: string;
  body: string;
  version: number | null;
};
type Edge = {
  id: string;
  source: string;
  target: string;
  relationship: "dependency" | "evidence";
};
type Graph = { nodes: Node[]; edges: Edge[]; affected: string[] };

export function DecisionGraph({ id, writable }: { id: string; writable: boolean }) {
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [], affected: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [relationship, setRelationship] = useState<Edge["relationship"]>("dependency");
  const [title, setTitle] = useState("");
  const endpoint = `/api/studio/${id}/decision-graph`;
  const load = useCallback(
    async (changed = "") => {
      const result = await studioRequest<Graph>(
        endpoint + (changed ? `?changed=${encodeURIComponent(changed)}` : ""),
      );
      setGraph(result);
    },
    [endpoint],
  );
  useEffect(() => {
    let active = true;
    setBusy(true);
    studioRequest<Graph>(endpoint)
      .then((result) => {
        if (active) setGraph(result);
      })
      .catch((e) => {
        if (active) setError(String(e.message));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);
  async function action(work: () => Promise<unknown>, changed = "") {
    setBusy(true);
    setError("");
    try {
      await work();
      await load(changed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update relationships.");
    } finally {
      setBusy(false);
    }
  }
  const nodes = graph.nodes.filter((n) => !filter || n.kind === filter);
  const drawn = nodes.slice(0, 30);
  const position = (index: number) => ({
    x: 125 + (index % 3) * 270,
    y: 55 + Math.floor(index / 3) * 100,
  });
  const chosen = graph.nodes.find((n) => n.id === selected);
  return (
    <section
      className="st-card advanced-studio"
      aria-labelledby="decision-graph-heading"
      aria-busy={busy}
    >
      <h2 id="decision-graph-heading">Decision dependency map</h2>
      <p>
        Link a prerequisite to the records that depend on it. Select a record to inspect
        downstream impact. Evidence relationships do not count as dependencies.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="st-form-grid">
        <label>
          Record type
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All records</option>
            {["decision", "assumption", "knowledge", "research", "metric", "task"].map(
              (kind) => (
                <option key={kind}>{kind}</option>
              ),
            )}
          </select>
        </label>
        <button disabled={busy} onClick={() => void action(() => load())}>
          Refresh map
        </button>
      </div>
      {!nodes.length && (
        <p>
          {busy
            ? "Loading relationships…"
            : "Create a decision, add evidence or record an assumption to start your map."}
        </p>
      )}
      {!!drawn.length && (
        <svg
          viewBox={`0 0 800 ${Math.max(140, Math.ceil(drawn.length / 3) * 100 + 20)}`}
          style={{ width: "100%" }}
          role="group"
          aria-label="Interactive relationship overview"
        >
          <defs>
            <marker
              id={`arrow-${id}`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const a = drawn.findIndex((n) => n.id === edge.source),
              b = drawn.findIndex((n) => n.id === edge.target);
            if (a < 0 || b < 0) return null;
            const p = position(a),
              q = position(b);
            return (
              <line
                key={edge.id}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke="currentColor"
                opacity=".3"
                strokeDasharray={edge.relationship === "evidence" ? "5 5" : undefined}
                markerEnd={`url(#arrow-${id})`}
              />
            );
          })}
          {drawn.map((node, index) => {
            const p = position(index);
            const inspect = () => {
              if (!busy) {
                setSelected(node.id);
                void action(() => Promise.resolve(), node.id);
              }
            };
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={busy ? -1 : 0}
                aria-label={`Inspect ${node.title}`}
                aria-pressed={selected === node.id}
                aria-disabled={busy}
                onClick={inspect}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    inspect();
                  }
                }}
              >
                <rect
                  x={p.x - 108}
                  y={p.y - 26}
                  width="216"
                  height="52"
                  rx="14"
                  fill="rgb(var(--surface-overlay))"
                  stroke="currentColor"
                  opacity={graph.affected.includes(node.id) ? 1 : 0.7}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="13"
                >
                  {node.title.length > 25 ? node.title.slice(0, 23) + "…" : node.title}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {nodes.length > 30 && (
        <p>
          The overview shows the first 30 filtered records. The complete list remains
          available below.
        </p>
      )}
      <ul>
        {nodes.map((node) => (
          <li key={node.id}>
            <button
              aria-pressed={selected === node.id}
              disabled={busy}
              onClick={() => {
                setSelected(node.id);
                void action(() => Promise.resolve(), node.id);
              }}
            >
              {node.title} · {node.kind}
            </button>
            {graph.affected.includes(node.id) && <span> — downstream impact</span>}
          </li>
        ))}
      </ul>
      {chosen && (
        <article aria-live="polite">
          <h3>{chosen.title}</h3>
          <p>{chosen.body || "No description saved."}</p>
          <p>
            {graph.affected.length} downstream records. Selecting a node does not change
            saved work.
          </p>
        </article>
      )}
      <ul aria-label="Saved relationships">
        {graph.edges.map((edge) => (
          <li key={edge.id}>
            {graph.nodes.find((n) => n.id === edge.source)?.title} →{" "}
            {graph.nodes.find((n) => n.id === edge.target)?.title} · {edge.relationship}
            {writable && (
              <button
                disabled={busy}
                onClick={() =>
                  void action(() =>
                    studioRequest(`${endpoint}/edges/${edge.id}`, "DELETE"),
                  )
                }
              >
                Unlink relationship
              </button>
            )}
          </li>
        ))}
      </ul>
      {writable && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                await studioRequest(`${endpoint}/edges`, "POST", {
                  source,
                  target,
                  relationship,
                });
              });
            }}
          >
            <div className="st-form-grid">
              <label>
                Prerequisite/source
                <select
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="">Choose record</option>
                  {graph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title} · {n.kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dependent/target
                <select
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">Choose record</option>
                  {graph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title} · {n.kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Relationship
                <select
                  value={relationship}
                  onChange={(e) =>
                    setRelationship(e.target.value as Edge["relationship"])
                  }
                >
                  <option value="dependency">Dependency</option>
                  <option value="evidence">Evidence</option>
                </select>
              </label>
            </div>
            <button disabled={busy || !source || !target}>Link records</button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                await studioRequest(`${endpoint}/assumptions`, "POST", { title });
                setTitle("");
              });
            }}
          >
            <label>
              New assumption
              <input
                required
                maxLength={240}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <button disabled={busy || !title.trim()}>Add assumption</button>
          </form>
        </>
      )}
    </section>
  );
}
