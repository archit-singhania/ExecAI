"use client";
import { useEffect, useRef, useState } from "react";
import { API_BASE, studioRequest, StudioRecord } from "@/lib/studio";
import { getToken } from "@/lib/auth";
export type Slide = { title: string; body: string; notes?: string };
export type DeckData = {
  slides: Slide[];
  chart?: { labels: string[]; values: number[]; label: string } | null;
};
type Deck = StudioRecord & { data: DeckData };
export function DeckViewer({ deck }: { deck: DeckData }) {
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = deck.slides[Math.min(index, deck.slides.length - 1)];
  const chart = deck.chart;
  return (
    <div
      ref={ref}
      className="deck-viewer"
      tabIndex={0}
      role="region"
      aria-label="Board presentation viewer"
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setIndex((i) => Math.min(i + 1, deck.slides.length - 1));
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setIndex((i) => Math.max(0, i - 1));
        }
      }}
    >
      {error && <p role="alert">{error}</p>}
      <article className="deck-slide" aria-live="polite">
        <p>
          Board brief · {Math.min(index + 1, deck.slides.length)} / {deck.slides.length}
        </p>
        <h2>{current?.title}</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{current?.body}</p>
      </article>
      <div>
        <button
          disabled={index <= 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Previous slide
        </button>
        <button
          disabled={index >= deck.slides.length - 1}
          onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
        >
          Next slide
        </button>
        <button
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await ref.current?.requestFullscreen();
            } catch {
              setError(
                "Fullscreen is unavailable. The presentation remains usable here.",
              );
            }
          }}
        >
          Toggle fullscreen presentation
        </button>
      </div>
      {chart && (
        <details>
          <summary>{chart.label}</summary>
          <ul>
            {chart.labels.map((label, i) => (
              <li key={`${label}-${i}`}>
                {label}: {chart.values[i]}
              </li>
            ))}
          </ul>
          <p>
            Entered scenario values; not forecast guarantees. PowerPoint export includes
            the comparison chart.
          </p>
        </details>
      )}
    </div>
  );
}
export function Presentations({
  id,
  records,
  writable,
}: {
  id: string;
  records: StudioRecord[];
  writable: boolean;
}) {
  const path = `/api/studio/${id}/presentations`;
  const [items, setItems] = useState<Deck[]>([]);
  const [selected, setSelected] = useState<Deck | null>(null);
  const [decision, setDecision] = useState("");
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [share, setShare] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    studioRequest<Deck[]>(path)
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
  function open(deck: Deck) {
    setSelected(deck);
    setTitle(deck.title);
    setSlides(deck.data.slides.map((s) => ({ ...s })));
    setShare("");
  }
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setItems(await studioRequest<Deck[]>(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update presentation.");
    } finally {
      setBusy(false);
    }
  }
  async function download(format: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE}${path}/${selected.id}/export/${format}`,
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) {
        const value = await response.json().catch(() => ({}));
        throw new Error(value.detail || "Presentation export failed.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `ceoai-board.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Export downloaded. Speaker notes were excluded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to download export.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="st-card advanced-studio"
      aria-labelledby="presentations-heading"
      aria-busy={busy}
    >
      <h2 id="presentations-heading">Board presentations</h2>
      <p>
        Build an editable brief from a saved decision, approved evidence and optional
        scenario comparisons. Exports and public links exclude speaker notes by default.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {writable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              const deck = await studioRequest<Deck>(path, "POST", {
                decision_id: decision,
                scenario_ids: scenarios,
              });
              open(deck);
              setNotice("Presentation generated from saved source snapshots.");
            });
          }}
        >
          <label>
            Presentation decision
            <select
              required
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="">Choose decision</option>
              {records
                .filter((r) => r.kind === "decision")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
            </select>
          </label>
          {records
            .filter((r) => r.kind === "scenario")
            .map((r) => (
              <label key={r.id} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={scenarios.includes(r.id)}
                  disabled={!scenarios.includes(r.id) && scenarios.length >= 6}
                  onChange={(e) =>
                    setScenarios((old) =>
                      e.target.checked ? [...old, r.id] : old.filter((v) => v !== r.id),
                    )
                  }
                />
                Include scenario: {r.title}
              </label>
            ))}
          <button disabled={busy || !decision}>Generate board presentation</button>
        </form>
      )}
      {!items.length && <p>No saved board presentations.</p>}
      {items.map((deck) => (
        <button
          key={deck.id}
          disabled={busy}
          aria-pressed={selected?.id === deck.id}
          onClick={() => open(deck)}
        >
          Open presentation: {deck.title}
        </button>
      ))}
      {selected && (
        <>
          <DeckViewer key={selected.id + ":" + selected.version} deck={selected.data} />
          <button disabled={busy} onClick={() => void download("pdf")}>
            Download board PDF
          </button>
          <button disabled={busy} onClick={() => void download("pptx")}>
            Download board PowerPoint
          </button>
          {writable && (
            <details>
              <summary>Edit slides and private speaker notes</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    const deck = await studioRequest<Deck>(
                      `${path}/${selected.id}`,
                      "PUT",
                      { title, slides, version: selected.version },
                    );
                    open(deck);
                    setNotice(
                      "Presentation edits saved; previously shared snapshots remain unchanged.",
                    );
                  });
                }}
              >
                <label>
                  Presentation title
                  <input
                    required
                    maxLength={240}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                {slides.map((slide, i) => (
                  <fieldset key={i} disabled={busy}>
                    <legend>Slide {i + 1}</legend>
                    {["title", "body", "notes"].map((field) => (
                      <label key={field}>
                        {field === "notes" ? "Private speaker notes" : field} · slide{" "}
                        {i + 1}
                        <textarea
                          required={field === "title"}
                          maxLength={
                            field === "title" ? 160 : field === "body" ? 2000 : 5000
                          }
                          value={slide[field as keyof Slide] || ""}
                          onChange={(e) =>
                            setSlides((old) =>
                              old.map((s, k) =>
                                k === i ? { ...s, [field]: e.target.value } : s,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      disabled={slides.length <= 1}
                      onClick={() => setSlides((old) => old.filter((_, k) => k !== i))}
                    >
                      Remove slide {i + 1}
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  disabled={slides.length >= 20}
                  onClick={() =>
                    setSlides((old) => [
                      ...old,
                      { title: "New slide", body: "", notes: "" },
                    ])
                  }
                >
                  Add slide
                </button>
                <button disabled={busy}>Save presentation edits</button>
              </form>
            </details>
          )}
          {writable && (
            <details>
              <summary>Publish a reviewed snapshot</summary>
              <p>
                The current saved slides and scenario chart become public to anyone with
                the link. Speaker notes and raw source snapshots remain private.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    const result = await studioRequest<{ url: string }>(
                      `${path}/${selected.id}/share`,
                      "POST",
                    );
                    setShare(result.url);
                    setNotice(
                      "Revocable snapshot published. Saved edits do not change this snapshot.",
                    );
                  })
                }
              >
                Publish presentation snapshot
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await studioRequest(`${path}/${selected.id}/share`, "DELETE");
                    setShare("");
                    setNotice("All links for this presentation were revoked.");
                  })
                }
              >
                Revoke presentation links
              </button>
              {share && (
                <p>
                  <a href={share} target="_blank" rel="noreferrer">
                    {share}
                  </a>
                </p>
              )}
            </details>
          )}
        </>
      )}
    </section>
  );
}
