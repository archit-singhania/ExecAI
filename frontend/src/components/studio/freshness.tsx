"use client";
import { useEffect, useState } from "react";
import { studioRequest, StudioRecord } from "@/lib/studio";
type Evidence = {
  title: string;
  body: string;
  version: number;
  data: Record<string, unknown>;
};
type Alert = StudioRecord & {
  data: {
    decision_title: string;
    evidence_title: string;
    reason: string;
    state: string;
    before: Evidence;
    after: Evidence | null;
  };
};
type State = { baselines: StudioRecord[]; alerts: Alert[] };
export function Freshness({
  id,
  records,
  writable,
}: {
  id: string;
  records: StudioRecord[];
  writable: boolean;
}) {
  const path = `/api/studio/${id}/freshness`;
  const [state, setState] = useState<State>({ baselines: [], alerts: [] });
  const [decision, setDecision] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    studioRequest<State>(path)
      .then((v) => {
        if (active) setState(v);
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
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setState(await studioRequest<State>(path));
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update evidence review.");
    } finally {
      setBusy(false);
    }
  }
  const sources = records.filter((r) =>
    ["knowledge", "research", "metric"].includes(r.kind),
  );
  const decisions = records.filter((r) => r.kind === "decision");
  return (
    <section
      className="st-card advanced-studio"
      aria-labelledby="freshness-heading"
      aria-busy={busy}
    >
      <h2 id="freshness-heading">Evidence freshness</h2>
      <p>
        Approve a snapshot of supporting evidence. Stored revisions generate change
        alerts; entered review dates flag overdue research. A review date does not prove
        that an external website changed.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p>{state.baselines.length} decisions with saved evidence baselines.</p>
      {writable && (
        <button
          disabled={busy}
          onClick={() =>
            void action(
              () => studioRequest(path + "/scan", "POST"),
              "Evidence review completed.",
            )
          }
        >
          Check evidence freshness
        </button>
      )}
      {!state.alerts.length && (
        <p>
          No recorded evidence alerts. Save an approval baseline and run a check to
          assess review dates and removals.
        </p>
      )}
      {state.alerts.map((alert) => (
        <article key={alert.id}>
          <h3>{alert.data.decision_title}</h3>
          <p>
            {alert.data.evidence_title} · {alert.data.reason.replaceAll("_", " ")} ·{" "}
            {alert.data.state}
          </p>
          <details>
            <summary>Inspect evidence change</summary>
            <div className="st-form-grid">
              <div>
                <h4>Approved snapshot · version {alert.data.before.version}</h4>
                <p>{alert.data.before.body}</p>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(alert.data.before.data, null, 2)}
                </pre>
              </div>
              <div>
                <h4>Observed revision</h4>
                {alert.data.after ? (
                  <>
                    <p>Version {alert.data.after.version}</p>
                    <p>{alert.data.after.body}</p>
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(alert.data.after.data, null, 2)}
                    </pre>
                  </>
                ) : (
                  <p>Supporting record removed.</p>
                )}
              </div>
            </div>
          </details>
          {writable && (
            <>
              <button
                disabled={busy || alert.data.state !== "open"}
                onClick={() =>
                  void action(
                    () =>
                      studioRequest(`${path}/alerts/${alert.id}`, "PATCH", {
                        state: "acknowledged",
                      }),
                    "Alert acknowledged; decision remains unchanged.",
                  )
                }
              >
                Acknowledge alert
              </button>
              <button
                disabled={busy || alert.data.state === "reviewed"}
                onClick={() =>
                  void action(
                    () =>
                      studioRequest(`${path}/alerts/${alert.id}`, "PATCH", {
                        state: "reviewed",
                      }),
                    "Review recorded; approval baseline remains inspectable.",
                  )
                }
              >
                Mark evidence reviewed
              </button>
            </>
          )}
        </article>
      ))}
      {writable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await studioRequest(path + "/baselines", "POST", {
                confirmed: true,
                decision_id: decision,
                evidence_ids: evidence,
                review_dates: Object.fromEntries(
                  evidence.filter((rid) => dates[rid]).map((rid) => [rid, dates[rid]]),
                ),
              });
              setConfirmed(false);
            }, "Approval baseline saved. Future changes will remain visible.");
          }}
        >
          <fieldset disabled={busy}>
            <legend>Approve supporting evidence</legend>
            <label>
              Decision to baseline
              <select
                required
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="">Choose decision</option>
                {decisions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            {!sources.length && (
              <p>
                Add knowledge, research or metrics before approving an evidence
                baseline.
              </p>
            )}
            {sources.map((source) => (
              <div key={source.id}>
                <label style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={evidence.includes(source.id)}
                    onChange={(e) =>
                      setEvidence((old) =>
                        e.target.checked
                          ? [...old, source.id]
                          : old.filter((v) => v !== source.id),
                      )
                    }
                  />
                  {source.title} · version {source.version}
                </label>
                {evidence.includes(source.id) && (
                  <label>
                    Review date for {source.title}
                    <input
                      type="date"
                      value={dates[source.id] || ""}
                      onChange={(e) =>
                        setDates((old) => ({ ...old, [source.id]: e.target.value }))
                      }
                    />
                  </label>
                )}
              </div>
            ))}
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                required
                type="checkbox"
                style={{ width: "auto" }}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I reviewed this decision and its selected supporting evidence.
            </label>
            <button disabled={!decision || !evidence.length || !confirmed}>
              Save approval baseline
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
