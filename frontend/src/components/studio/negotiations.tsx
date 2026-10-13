"use client";
import { useEffect, useState } from "react";
import { studioRequest, StudioRecord } from "@/lib/studio";
import { NegotiationPractice } from "./negotiation-practice";
type Constraint = { name: string; unit: string; minimum: string; maximum: string };
type Package = { name: string; values: string[] };
type Check = {
  name: string;
  unit: string;
  minimum: number | null;
  maximum: number | null;
  value: number;
  violated: boolean;
};
type Saved = StudioRecord & {
  data: {
    alternative: string;
    counterpart: string;
    constraints: Check[];
    packages: { name: string; values: Record<string, number> }[];
    comparison: { name: string; within_limits: boolean; checks: Check[] }[];
  };
};
const blankConstraint = (): Constraint => ({
  name: "",
  unit: "",
  minimum: "",
  maximum: "",
});
export function Negotiations({ id, writable }: { id: string; writable: boolean }) {
  const path = `/api/studio/${id}/negotiations`;
  const [items, setItems] = useState<Saved[]>([]);
  const [editing, setEditing] = useState<Saved | null>(null);
  const [title, setTitle] = useState("");
  const [objectives, setObjectives] = useState("");
  const [alternative, setAlternative] = useState("");
  const [counterpart, setCounterpart] = useState("");
  const [constraints, setConstraints] = useState<Constraint[]>([blankConstraint()]);
  const [packages, setPackages] = useState<Package[]>([
    { name: "Package A", values: [""] },
    { name: "Package B", values: [""] },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    studioRequest<Saved[]>(path)
      .then((v) => {
        if (active) setItems(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [path]);
  function open(item: Saved) {
    setEditing(item);
    setTitle(item.title);
    setObjectives(item.body);
    setAlternative(item.data.alternative);
    setCounterpart(item.data.counterpart);
    setConstraints(
      item.data.constraints.map((c) => ({
        name: c.name,
        unit: c.unit,
        minimum: c.minimum === null ? "" : String(c.minimum),
        maximum: c.maximum === null ? "" : String(c.maximum),
      })),
    );
    setPackages(
      item.data.packages.map((p) => ({
        name: p.name,
        values: item.data.constraints.map((c) => String(p.values[c.name])),
      })),
    );
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await studioRequest<Saved>(
        path + (editing ? `/${editing.id}` : ""),
        editing ? "PUT" : "POST",
        {
          title,
          objectives,
          alternative,
          counterpart,
          version: editing?.version,
          constraints: constraints.map((c) => ({
            ...c,
            minimum: c.minimum === "" ? null : Number(c.minimum),
            maximum: c.maximum === "" ? null : Number(c.maximum),
          })),
          packages: packages.map((p) => ({
            name: p.name,
            values: Object.fromEntries(
              constraints.map((c, i) => [c.name.trim(), Number(p.values[i])]),
            ),
          })),
        },
      );
      setItems(await studioRequest<Saved[]>(path));
      open(value);
      setNotice(
        "Comparison saved. Reservation limits are checks, not approval of an agreement.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to compare packages.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="st-card advanced-studio"
      aria-labelledby="negotiation-heading"
      aria-busy={busy}
    >
      <h2 id="negotiation-heading">Negotiation studio</h2>
      <p>
        Define your objectives, alternative and reservation limits. Compare concession
        packages without sending or approving an agreement.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!items.length && (
        <p>
          {busy
            ? "Loading saved negotiations…"
            : "No saved negotiations in this workspace."}
        </p>
      )}
      {items.map((item) => (
        <article key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <p>Alternative: {item.data.alternative || "Not entered"}</p>
          <p>Counterpart assumptions: {item.data.counterpart || "Not entered"}</p>
          <div className="st-form-grid">
            {item.data.comparison.map((p) => (
              <section className="st-card" key={p.name}>
                <h4>{p.name}</h4>
                <p>
                  <strong>
                    {p.within_limits
                      ? "Within entered limits"
                      : "Reservation limit violated"}
                  </strong>
                </p>
                <ul>
                  {p.checks.map((c) => (
                    <li key={c.name}>
                      {c.name}: {c.value} {c.unit} · {c.minimum ?? "unbounded"} to{" "}
                      {c.maximum ?? "unbounded"}
                      {c.violated ? " · Outside limit" : " · Within limit"}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {writable && (
            <button disabled={busy} onClick={() => open(item)}>
              Edit negotiation: {item.title}
            </button>
          )}
          <NegotiationPractice
            workspace={id}
            negotiation={item.id}
            version={item.version}
            writable={writable}
          />
        </article>
      ))}
      {writable && (
        <details open={!!editing}>
          <summary>
            {editing ? "Edit saved negotiation" : "Create a negotiation comparison"}
          </summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy}>
              <legend>
                {editing ? `Version ${editing.version}` : "New comparison"}
              </legend>
              <label>
                Negotiation title
                <input
                  required
                  maxLength={240}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Negotiation objectives
                <textarea
                  required
                  maxLength={10000}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                />
              </label>
              <label>
                Best available alternative
                <textarea
                  maxLength={5000}
                  value={alternative}
                  onChange={(e) => setAlternative(e.target.value)}
                />
              </label>
              <label>
                Counterpart assumptions
                <textarea
                  maxLength={5000}
                  value={counterpart}
                  onChange={(e) => setCounterpart(e.target.value)}
                />
              </label>
              {constraints.map((c, i) => (
                <fieldset key={i}>
                  <legend>Reservation variable {i + 1}</legend>
                  <label>
                    Variable name {i + 1}
                    <input
                      required
                      maxLength={120}
                      value={c.name}
                      onChange={(e) =>
                        setConstraints((old) =>
                          old.map((v, j) =>
                            j === i ? { ...v, name: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Unit {i + 1}
                    <input
                      maxLength={40}
                      value={c.unit}
                      onChange={(e) =>
                        setConstraints((old) =>
                          old.map((v, j) =>
                            j === i ? { ...v, unit: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="st-form-grid">
                    {["minimum", "maximum"].map((bound) => (
                      <label key={bound}>
                        {bound} {i + 1}
                        <input
                          type="number"
                          step="any"
                          value={c[bound as "minimum" | "maximum"]}
                          onChange={(e) =>
                            setConstraints((old) =>
                              old.map((v, j) =>
                                j === i ? { ...v, [bound]: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                  {constraints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setConstraints((old) => old.filter((_, j) => j !== i));
                        setPackages((old) =>
                          old.map((p) => ({
                            ...p,
                            values: p.values.filter((_, j) => j !== i),
                          })),
                        );
                      }}
                    >
                      Remove variable {i + 1}
                    </button>
                  )}
                </fieldset>
              ))}
              <button
                type="button"
                disabled={constraints.length >= 30}
                onClick={() => {
                  setConstraints((old) => [...old, blankConstraint()]);
                  setPackages((old) =>
                    old.map((p) => ({ ...p, values: [...p.values, ""] })),
                  );
                }}
              >
                Add reservation variable
              </button>
              <div className="st-form-grid">
                {packages.map((p, i) => (
                  <fieldset key={i}>
                    <legend>Concession package {i + 1}</legend>
                    <label>
                      Package name {i + 1}
                      <input
                        required
                        maxLength={120}
                        value={p.name}
                        onChange={(e) =>
                          setPackages((old) =>
                            old.map((v, j) =>
                              j === i ? { ...v, name: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    {constraints.map((c, k) => (
                      <label key={k}>
                        {p.name || `Package ${i + 1}`} — {c.name || `Variable ${k + 1}`}
                        <input
                          required
                          type="number"
                          step="any"
                          value={p.values[k]}
                          onChange={(e) =>
                            setPackages((old) =>
                              old.map((v, j) =>
                                j === i
                                  ? {
                                      ...v,
                                      values: v.values.map((n, m) =>
                                        m === k ? e.target.value : n,
                                      ),
                                    }
                                  : v,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    {packages.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPackages((old) => old.filter((_, j) => j !== i))
                        }
                      >
                        Remove package {i + 1}
                      </button>
                    )}
                  </fieldset>
                ))}
              </div>
              <button
                type="button"
                disabled={packages.length >= 20}
                onClick={() =>
                  setPackages((old) => [
                    ...old,
                    {
                      name: `Package ${old.length + 1}`,
                      values: constraints.map(() => ""),
                    },
                  ])
                }
              >
                Add concession package
              </button>
              <button>Save negotiation comparison</button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setTitle("");
                    setObjectives("");
                    setAlternative("");
                    setCounterpart("");
                    setConstraints([blankConstraint()]);
                    setPackages([
                      { name: "Package A", values: [""] },
                      { name: "Package B", values: [""] },
                    ]);
                  }}
                >
                  Start new comparison
                </button>
              )}
            </fieldset>
          </form>
        </details>
      )}
    </section>
  );
}
