"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { studioRequest } from "@/lib/studio";
import { getStoredUser } from "@/lib/auth";

type Criterion = {
  label: string;
  kind: "numeric" | "qualitative";
  target: number | null;
  unit: string;
  period: string;
  expected: string;
};
type Observation = {
  actual: number | null;
  unit: string;
  period: string;
  narrative: string;
  source: string;
  measured_on: string | null;
};
type Baseline = {
  id: string;
  data: { decision_title: string; decision_version: number };
};
type Review = {
  id: string;
  title: string;
  version: number;
  data: {
    status: string;
    review_date: string;
    criteria: Criterion[];
    observations: Observation[];
    lessons: string;
    unexpected_effects: string;
    actions: string[];
    previous_review_id: string | null;
    decision: { title: string; body: string; version: number };
    baseline: {
      data: {
        evidence: {
          id: string;
          title: string;
          version: number;
          body: string;
          data: unknown;
        }[];
      };
    };
    comparisons: { variance: number | null; explanation: string }[];
  };
};
const criterion = (): Criterion => ({
  label: "",
  kind: "numeric",
  target: null,
  unit: "",
  period: "",
  expected: "",
});

export function OutcomeReviews({ id, writable }: { id: string; writable: boolean }) {
  const path = `/api/studio/${id}/outcome-reviews`;
  const [rows, setRows] = useState<Review[]>([]);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [baseline, setBaseline] = useState("");
  const [date, setDate] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([criterion()]);
  const [active, setActive] = useState<Review | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [conflictDraft, setConflictDraft] = useState("");
  const draftKey = () =>
    `ceoai-outcome-draft:${getStoredUser()?.id ?? "anonymous"}:${id}`;
  useEffect(() => {
    let alive = true;
    setBusy(true);
    Promise.all([
      studioRequest<Review[]>(path),
      studioRequest<{ baselines: Baseline[] }>(`/api/studio/${id}/freshness`),
    ])
      .then(([reviews, evidence]) => {
        if (alive) {
          setRows(reviews);
          setBaselines(evidence.baselines);
          try {
            const raw = sessionStorage.getItem(
              `ceoai-outcome-draft:${getStoredUser()?.id ?? "anonymous"}:${id}`,
            );
            if (raw && writable) {
              const saved = JSON.parse(raw);
              const current = reviews.find((r) => r.id === saved.id);
              if (
                current &&
                current.version === saved.version &&
                current.data.status === "draft" &&
                Array.isArray(saved.observations) &&
                saved.observations.length === current.data.criteria.length &&
                saved.observations.every(
                  (o: Observation) =>
                    o &&
                    typeof o.unit === "string" &&
                    typeof o.period === "string" &&
                    typeof o.narrative === "string" &&
                    typeof o.source === "string" &&
                    (o.actual === null ||
                      (typeof o.actual === "number" && Number.isFinite(o.actual))) &&
                    (o.measured_on === null || typeof o.measured_on === "string"),
                ) &&
                typeof saved.lessons === "string" &&
                typeof saved.unexpected_effects === "string" &&
                Array.isArray(saved.actions) &&
                saved.actions.every((a: unknown) => typeof a === "string")
              ) {
                setActive({
                  ...current,
                  data: {
                    ...current.data,
                    observations: saved.observations,
                    lessons: saved.lessons,
                    unexpected_effects: saved.unexpected_effects,
                    actions: saved.actions,
                  },
                });
                setDirty(true);
                setNotice(
                  "Recovered unsaved observations from this browser tab. Save to persist them on the server.",
                );
              } else if (current) {
                setConflictDraft(raw);
                setNotice(
                  "The saved review changed. Your local notes are available below for manual reconciliation; nothing was overwritten.",
                );
              }
            }
          } catch {
            setNotice(
              "Local draft could not be recovered. Saved server reviews remain available.",
            );
          }
        }
      })
      .catch((e) => {
        if (alive) setError(String(e.message));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [id, path, writable]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Request failed. Your draft remains here.",
      );
    } finally {
      setBusy(false);
    }
  }
  function accept(row: Review) {
    setRows((old) => [row, ...old.filter((r) => r.id !== row.id)]);
    setActive(row);
    setDirty(false);
    setSelected([]);
    try {
      sessionStorage.removeItem(draftKey());
    } catch {
      /* Server save already succeeded. */
    }
    setConflictDraft("");
  }
  function edit(patch: Partial<Review["data"]>) {
    if (active) {
      const next = { ...active, data: { ...active.data, ...patch } };
      setActive(next);
      setDirty(true);
      try {
        sessionStorage.setItem(
          draftKey(),
          JSON.stringify({
            id: next.id,
            version: next.version,
            observations: next.data.observations,
            lessons: next.data.lessons,
            unexpected_effects: next.data.unexpected_effects,
            actions: next.data.actions,
          }),
        );
      } catch {
        setNotice("Browser draft storage is unavailable. Save before navigating away.");
      }
    }
  }
  const editable = writable && active?.data.status === "draft";
  return (
    <section className="st-card advanced-studio" aria-labelledby="outcome-heading">
      <h2 id="outcome-heading">Decision outcome reviews</h2>
      <p>
        Compare expectations with observed results. A completed review stays frozen;
        corrections create a linked draft.
      </p>
      <p>
        Start from a current approved evidence baseline in Evidence freshness.
        Expectations are recorded when this review is created, not backdated to decision
        approval.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {conflictDraft && (
        <details>
          <summary>Recover local notes from a changed review</summary>
          <textarea
            readOnly
            aria-label="Conflicting local review notes"
            value={conflictDraft}
          />
          <button
            disabled={busy}
            onClick={() => {
              try {
                sessionStorage.removeItem(draftKey());
              } catch {
                /* Local storage may be unavailable. */
              }
              setConflictDraft("");
            }}
          >
            Discard conflicting local notes
          </button>
        </details>
      )}
      {busy && <p role="status">Saving or loading review records…</p>}
      {writable && (
        <details>
          <summary>Create outcome review</summary>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const evidence = await studioRequest<{ baselines: Baseline[] }>(
                  `/api/studio/${id}/freshness`,
                );
                setBaselines(evidence.baselines);
                setNotice("Approved baselines refreshed.");
              })
            }
          >
            Refresh approved baselines
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const row = await studioRequest<Review>(path, "POST", {
                  baseline_id: baseline,
                  review_date: date,
                  criteria,
                });
                accept(row);
                setNotice(
                  "Review created with frozen decision and evidence snapshots.",
                );
              });
            }}
          >
            <fieldset disabled={busy || dirty}>
              <legend>Original expectations</legend>
              <label>
                Approved evidence baseline
                <select
                  required
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                >
                  <option value="">Choose a decision baseline</option>
                  {baselines.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.data.decision_title} · revision {b.data.decision_version}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Review date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              {criteria.map((c, i) => (
                <fieldset key={i}>
                  <legend>Criterion {i + 1}</legend>
                  <label>
                    Criterion label
                    <input
                      required
                      maxLength={240}
                      value={c.label}
                      onChange={(e) =>
                        setCriteria(
                          criteria.map((v, n) =>
                            n === i ? { ...v, label: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Assessment type
                    <select
                      value={c.kind}
                      onChange={(e) =>
                        setCriteria(
                          criteria.map((v, n) =>
                            n === i
                              ? { ...v, kind: e.target.value as Criterion["kind"] }
                              : v,
                          ),
                        )
                      }
                    >
                      <option value="numeric">Numeric</option>
                      <option value="qualitative">Qualitative</option>
                    </select>
                  </label>
                  {c.kind === "numeric" ? (
                    <>
                      <label>
                        Target
                        <input
                          required
                          type="number"
                          step="any"
                          value={c.target ?? ""}
                          onChange={(e) =>
                            setCriteria(
                              criteria.map((v, n) =>
                                n === i
                                  ? {
                                      ...v,
                                      target:
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                    }
                                  : v,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Unit
                        <input
                          required
                          maxLength={80}
                          value={c.unit}
                          onChange={(e) =>
                            setCriteria(
                              criteria.map((v, n) =>
                                n === i ? { ...v, unit: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Reporting period
                        <input
                          required
                          maxLength={160}
                          placeholder="For example: October 2026"
                          value={c.period}
                          onChange={(e) =>
                            setCriteria(
                              criteria.map((v, n) =>
                                n === i ? { ...v, period: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <label>
                      Expected outcome
                      <textarea
                        required
                        maxLength={2000}
                        value={c.expected}
                        onChange={(e) =>
                          setCriteria(
                            criteria.map((v, n) =>
                              n === i ? { ...v, expected: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                </fieldset>
              ))}
              <button
                type="button"
                disabled={criteria.length >= 30}
                onClick={() => setCriteria([...criteria, criterion()])}
              >
                Add criterion
              </button>
              <button type="submit" disabled={!baselines.length}>
                Create review
              </button>
            </fieldset>
          </form>
        </details>
      )}
      {!rows.length && !busy && <p>No outcome reviews yet.</p>}
      <div aria-label="Saved outcome reviews">
        {rows.map((r) => (
          <button
            key={r.id}
            disabled={busy || dirty}
            aria-pressed={active?.id === r.id}
            onClick={() => {
              setActive(r);
              setSelected([]);
            }}
          >
            {r.title} · {r.data.status} · {r.data.review_date}
          </button>
        ))}
      </div>
      {dirty && (
        <p role="status">
          Unsaved review changes. Save before selecting another review.
        </p>
      )}
      {active && (
        <article>
          <h3>{active.title}</h3>
          <p>
            Review revision {active.version} · {active.data.status}
          </p>
          {active.data.previous_review_id && (
            <p>Correction of review {active.data.previous_review_id}</p>
          )}
          <details>
            <summary>Frozen decision and evidence</summary>
            <h4>
              {active.data.decision.title} · decision revision{" "}
              {active.data.decision.version}
            </h4>
            <p>{active.data.decision.body}</p>
            {active.data.baseline.data.evidence.map((e) => (
              <section key={e.id}>
                <h4>
                  {e.title} · revision {e.version}
                </h4>
                <p>{e.body}</p>
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {JSON.stringify(e.data, null, 2)}
                </pre>
              </section>
            ))}
          </details>
          <fieldset disabled={!editable || busy}>
            <legend>Observations</legend>
            {active.data.criteria.map((c, i) => {
              const obs = active.data.observations[i];
              const change = (patch: Partial<Observation>) =>
                edit({
                  observations: active.data.observations.map((v, n) =>
                    n === i ? { ...v, ...patch } : v,
                  ),
                });
              return (
                <fieldset key={i}>
                  <legend>{c.label}</legend>
                  <p>
                    Expected:{" "}
                    {c.kind === "numeric"
                      ? `${c.target} ${c.unit} · ${c.period}`
                      : c.expected}
                  </p>
                  {c.kind === "numeric" && (
                    <>
                      <label>
                        Actual value (blank means unknown)
                        <input
                          type="number"
                          step="any"
                          value={obs.actual ?? ""}
                          onChange={(e) =>
                            change({
                              actual:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Observed unit
                        <input
                          maxLength={80}
                          value={obs.unit}
                          onChange={(e) => change({ unit: e.target.value })}
                        />
                      </label>
                      <label>
                        Observed period
                        <input
                          maxLength={160}
                          value={obs.period}
                          onChange={(e) => change({ period: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Observation notes
                    <textarea
                      maxLength={3000}
                      value={obs.narrative}
                      onChange={(e) => change({ narrative: e.target.value })}
                    />
                  </label>
                  <label>
                    Source / measurement reference
                    <input
                      maxLength={2000}
                      value={obs.source}
                      onChange={(e) => change({ source: e.target.value })}
                    />
                  </label>
                  <label>
                    Measured on
                    <input
                      type="date"
                      value={obs.measured_on ?? ""}
                      onChange={(e) => change({ measured_on: e.target.value || null })}
                    />
                  </label>
                  <p>
                    {dirty
                      ? "Save to recalculate comparison."
                      : `${active.data.comparisons[i].variance === null ? "Not numerically comparable" : `Variance: ${active.data.comparisons[i].variance}`} — ${active.data.comparisons[i].explanation}`}
                  </p>
                </fieldset>
              );
            })}
            <label>
              Lessons, including evidence limitations
              <textarea
                maxLength={10000}
                value={active.data.lessons}
                onChange={(e) => edit({ lessons: e.target.value })}
              />
            </label>
            <label>
              Unexpected effects
              <textarea
                maxLength={10000}
                value={active.data.unexpected_effects}
                onChange={(e) => edit({ unexpected_effects: e.target.value })}
              />
            </label>
            <label>
              Proposed follow-up actions (one per line, up to 220 characters each)
              <textarea
                value={active.data.actions.join("\n")}
                onChange={(e) => edit({ actions: e.target.value.split("\n") })}
              />
            </label>
          </fieldset>
          {editable && (
            <>
              {[false, true].map((complete) => (
                <button
                  key={String(complete)}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const row = await studioRequest<Review>(
                        `${path}/${active.id}`,
                        "PUT",
                        {
                          version: active.version,
                          observations: active.data.observations,
                          lessons: active.data.lessons,
                          unexpected_effects: active.data.unexpected_effects,
                          actions: active.data.actions.filter((a) => a.trim()),
                          complete,
                        },
                      );
                      accept(row);
                      setNotice(
                        complete
                          ? "Review completed and frozen."
                          : "Draft saved; comparisons recalculated.",
                      );
                    })
                  }
                >
                  {complete ? "Complete and freeze review" : "Save draft"}
                </button>
              ))}
            </>
          )}
          {writable && active.data.status === "completed" && (
            <>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    accept(
                      await studioRequest<Review>(
                        `${path}/${active.id}/corrections`,
                        "POST",
                        { version: active.version },
                      ),
                    ),
                  )
                }
              >
                Create correction draft
              </button>
              <fieldset disabled={busy}>
                <legend>Review actions before creating tasks</legend>
                {active.data.actions.map((a, i) => (
                  <label key={i}>
                    <input
                      style={{ width: "auto" }}
                      type="checkbox"
                      checked={selected.includes(i)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, i]
                            : selected.filter((n) => n !== i),
                        )
                      }
                    />
                    {a}
                  </label>
                ))}
                <button
                  disabled={!selected.length}
                  onClick={() =>
                    void run(async () => {
                      const result = await studioRequest<{ task_ids: string[] }>(
                        `${path}/${active.id}/tasks`,
                        "POST",
                        { version: active.version, confirmed: true, indexes: selected },
                      );
                      setNotice(
                        `${result.task_ids.length} tasks available in Execution. Repeating a selection does not create duplicates.`,
                      );
                      setSelected([]);
                    })
                  }
                >
                  Confirm selected tasks
                </button>
              </fieldset>
              <Link href="/studio/execution">Open Execution</Link>
            </>
          )}
        </article>
      )}
    </section>
  );
}
