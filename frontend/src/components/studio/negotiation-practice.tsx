"use client";
import { useEffect, useState } from "react";
import { studioRequest } from "@/lib/studio";
type Round = {
  id: string;
  data: {
    message: string;
    reply: string;
    provider: string;
    negotiation_version: number;
  };
};
export function NegotiationPractice({
  workspace,
  negotiation,
  version,
  writable,
}: {
  workspace: string;
  negotiation: string;
  version: number;
  writable: boolean;
}) {
  const path = `/api/studio/${workspace}/negotiations/${negotiation}/practice`;
  const [rounds, setRounds] = useState<Round[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    studioRequest<Round[]>(path)
      .then((r) => {
        if (active) setRounds(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path]);
  async function send() {
    setBusy(true);
    setError("");
    try {
      await studioRequest<Round>(path, "POST", { message, version });
      setRounds(await studioRequest<Round[]>(path));
      setMessage("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Practice failed; saved comparison unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details>
      <summary>Negotiation practice · {rounds.length} saved rounds</summary>
      <p>
        AI role-play using a configured provider. No agreement is approved or sent. Each
        round records the comparison version.
      </p>
      {error && <p role="alert">{error}</p>}
      <ol>
        {rounds.map((r) => (
          <li key={r.id}>
            <p>
              <strong>You:</strong> {r.data.message}
            </p>
            <p>
              <strong>Practice counterpart:</strong> {r.data.reply}
            </p>
            <small>
              {r.data.provider} · comparison version {r.data.negotiation_version}
            </small>
          </li>
        ))}
      </ol>
      {writable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label>
            Practice message
            <textarea
              required
              maxLength={3000}
              value={message}
              disabled={busy}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <button disabled={busy || !message.trim()}>
            {busy ? "Generating practice reply…" : "Send practice round"}
          </button>
        </form>
      )}
    </details>
  );
}
