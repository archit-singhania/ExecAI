import { DeckViewer, DeckData } from "@/components/studio/presentations";
export default async function SharedPresentation({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  let value: { title: string; presentation: DeckData | null } | null = null;
  try {
    const response = await fetch(`${api}/api/share/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (response.ok) value = await response.json();
  } catch {
    /* Explicit unavailable state below. */
  }
  if (!value?.presentation)
    return (
      <main className="material-page">
        <h1>Presentation unavailable</h1>
        <p>
          This link may have been revoked, or the service is temporarily unavailable.
        </p>
      </main>
    );
  return (
    <main className="public-deck advanced-studio">
      <h1>{value.title}</h1>
      <p>CEO.ai · Published presentation snapshot</p>
      <DeckViewer deck={value.presentation} />
    </main>
  );
}
