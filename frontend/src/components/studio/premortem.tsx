"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { studioRequest } from "@/lib/studio";
type Level = "low" | "medium" | "high";
type Risk = {
  origin?: "user" | "ai_proposal";
  id?: string;
  failure: string;
  likelihood: Level;
  impact: Level;
  warning: string;
  mitigation: string;
  task_id?: string;
};
type Analysis = {
  id: string;
  title: string;
  body: string;
  version: number;
  data: { risks: Risk[] };
};
const blankRisk = (): Risk => ({
  failure: "",
  likelihood: "medium",
  impact: "medium",
  warning: "",
  mitigation: "",
});
const templates: Risk[] = [
  {
    failure: "Customers do not adopt the proposed offer",
    likelihood: "medium",
    impact: "high",
    warning: "Discovery interviews and trial conversion miss the agreed target",
    mitigation: "Run buyer interviews and a bounded validation experiment",
  },
  {
    failure: "Delivery costs exceed available runway",
    likelihood: "medium",
    impact: "high",
    warning: "Actual spending repeatedly exceeds the approved budget",
    mitigation: "Review scope, cost assumptions and stop conditions",
  },
  {
    failure: "A critical supplier or dependency fails",
    likelihood: "low",
    impact: "high",
    warning: "Missed service commitments or unresolved incidents",
    mitigation: "Validate a backup supplier and recovery procedure",
  },
];
export function Premortem({ id, writable }: { id: string; writable: boolean }) {
  const path = `/api/studio/${id}/premortems`;
  const [items, setItems] = useState<Analysis[]>([]);
  const [editing, setEditing] = useState<Analysis | null>(null);
  const [title, setTitle] = useState("");
  const [strategy, setStrategy] = useState("");
  const [risks, setRisks] = useState<Risk[]>([blankRisk()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [proposal, setProposal] = useState<{ risks: Risk[]; provider: string } | null>(
    null,
  );
  const [confirm, setConfirm] = useState<{ analysis: Analysis; risk: Risk } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    setBusy(true);
    studioRequest<Analysis[]>(path)
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
  function open(item: Analysis) {
    setProposal(null);
    setEditing(item);
    setTitle(item.title);
    setStrategy(item.body);
    setRisks(item.data.risks.map((r) => ({ ...r })));
    setNotice("");
  }
  function change(index: number, patch: Partial<Risk>) {
    setRisks((old) =>
      old.map((risk, i) => (i === index ? { ...risk, ...patch } : risk)),
    );
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await studioRequest<Analysis>(
        path + (editing ? `/${editing.id}` : ""),
        editing ? "PUT" : "POST",
        { title, strategy, risks, version: editing?.version },
      );
      setItems(await studioRequest<Analysis[]>(path));
      open(value);
      setNotice("Pre-mortem saved. Assessments remain qualitative judgments.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save pre-mortem.");
    } finally {
      setBusy(false);
    }
  }
  async function propose() {
    setBusy(true);
    setError("");
    setProposal(null);
    try {
      setProposal(
        await studioRequest<{ risks: Risk[]; provider: string }>(
          path + "/proposals",
          "POST",
          { strategy },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Provider failed; draft preserved.");
    } finally {
      setBusy(false);
    }
  }
  async function createTask() {
    if (!confirm) return;
    setBusy(true);
    setError("");
    try {
      const result = await studioRequest<{ task_id: string; created: boolean }>(
        `${path}/${confirm.analysis.id}/risks/${confirm.risk.id}/task`,
        "POST",
        { confirmed: true },
      );
      const updated = await studioRequest<Analysis[]>(path);
      setItems(updated);
      if (editing?.id === confirm.analysis.id) {
        const refreshed = updated.find((a) => a.id === editing.id);
        if (refreshed) {
          setEditing(refreshed);
          setRisks((draft) =>
            draft.map((r) =>
              r.id === confirm.risk.id ? { ...r, task_id: result.task_id } : r,
            ),
          );
        }
      }
      setConfirm(null);
      setNotice(
        result.created
          ? "Mitigation task created. Find it in Execution."
          : "The existing mitigation task was preserved.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create task.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="st-card advanced-studio"
      aria-labelledby="premortem-heading"
      aria-busy={busy}
    >
      <h2 id="premortem-heading">Pre-mortem simulator</h2>
      <p>
        Imagine the strategy failed. Record failure paths, early warnings and practical
        mitigations. Low/medium/high are qualitative judgments, not measured
        probabilities.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!items.length && (
        <p>
          {busy
            ? "Loading saved pre-mortems…"
            : "No saved pre-mortems in this workspace."}
        </p>
      )}
      {items.map((item) => (
        <article key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <button disabled={busy} onClick={() => open(item)}>
            Open pre-mortem: {item.title}
          </button>
          <ul>
            {item.data.risks.map((risk) => (
              <li key={risk.id}>
                <strong>{risk.failure}</strong>
                {risk.origin === "ai_proposal" && (
                  <p>Reviewed AI proposal · qualitative judgment</p>
                )}
                <p>
                  Likelihood {risk.likelihood} · Impact {risk.impact}
                </p>
                <p>Warning: {risk.warning || "Not entered"}</p>
                <p>Mitigation: {risk.mitigation || "Not entered"}</p>
                {risk.task_id ? (
                  <p>
                    Linked task ·{" "}
                    <Link href="/studio/execution">View mitigation in Execution</Link>
                  </p>
                ) : (
                  writable && (
                    <button
                      disabled={busy || !risk.mitigation.trim()}
                      onClick={() => setConfirm({ analysis: item, risk })}
                    >
                      Review mitigation task
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
      {confirm && (
        <div className="st-card" role="region" aria-label="Confirm mitigation task">
          <h3>Create this task?</h3>
          <p>{confirm.risk.mitigation}</p>
          <p>The failure path and warning will be included in its description.</p>
          <button disabled={busy} onClick={() => void createTask()}>
            Confirm create mitigation task
          </button>
          <button disabled={busy} onClick={() => setConfirm(null)}>
            Cancel task creation
          </button>
        </div>
      )}
      {writable && (
        <>
          <button
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setTitle("");
              setStrategy("");
              setRisks([blankRisk()]);
            }}
          >
            Start new pre-mortem
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy}>
              <legend>
                {editing ? `Edit version ${editing.version}` : "New pre-mortem"}
              </legend>
              <label>
                Pre-mortem title
                <input
                  required
                  maxLength={240}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Proposed strategy
                <textarea
                  required
                  maxLength={10000}
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || !strategy.trim()}
                onClick={() => void propose()}
              >
                Request AI failure-path proposals
              </button>
              <p>
                Optional configured provider. Proposals are reviewed before entering
                your draft; saved work remains unchanged.
              </p>
              {proposal && (
                <section aria-label="Review AI proposals">
                  <h3>AI proposals · {proposal.provider}</h3>
                  <ul>
                    {proposal.risks.map((r, i) => (
                      <li key={i}>
                        <strong>{r.failure}</strong>
                        <p>{r.warning}</p>
                        <p>{r.mitigation}</p>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      risks.filter((r) => r.failure.trim()).length +
                        proposal.risks.length >
                        30
                    }
                    onClick={() => {
                      setRisks([
                        ...risks.filter((r) => r.failure.trim()),
                        ...proposal.risks,
                      ]);
                      setProposal(null);
                      setNotice(
                        "AI proposals added to the editable draft. Review judgments and save explicitly.",
                      );
                    }}
                  >
                    Accept proposals into draft
                  </button>
                  <button type="button" onClick={() => setProposal(null)}>
                    Discard AI proposals
                  </button>
                </section>
              )}
              {risks.map((risk, index) => (
                <fieldset key={risk.id || `draft-${index}`}>
                  <legend>Failure path {index + 1}</legend>
                  <label>
                    Failure path
                    <input
                      required
                      maxLength={2000}
                      value={risk.failure}
                      onChange={(e) => change(index, { failure: e.target.value })}
                    />
                  </label>
                  <label>
                    Qualitative likelihood
                    <select
                      value={risk.likelihood}
                      onChange={(e) =>
                        change(index, { likelihood: e.target.value as Level })
                      }
                    >
                      {["low", "medium", "high"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Qualitative impact
                    <select
                      value={risk.impact}
                      onChange={(e) =>
                        change(index, { impact: e.target.value as Level })
                      }
                    >
                      {["low", "medium", "high"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Early warning
                    <input
                      maxLength={2000}
                      value={risk.warning}
                      onChange={(e) => change(index, { warning: e.target.value })}
                    />
                  </label>
                  <label>
                    Mitigation
                    <input
                      maxLength={2000}
                      value={risk.mitigation}
                      onChange={(e) => change(index, { mitigation: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setRisks((old) => old.filter((_, i) => i !== index))}
                  >
                    Remove failure path {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                disabled={risks.length >= 30}
                onClick={() => setRisks((old) => [...old, blankRisk()])}
              >
                Add failure path
              </button>
              <button
                type="button"
                disabled={risks.length > 27}
                onClick={() =>
                  setRisks((old) => [
                    ...old.filter((r) => r.failure.trim()),
                    ...templates.map((r) => ({ ...r })),
                  ])
                }
              >
                Add editable local templates
              </button>
              <button>Save pre-mortem</button>
            </fieldset>
          </form>
        </>
      )}
    </section>
  );
}
