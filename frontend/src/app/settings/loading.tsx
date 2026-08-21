export default function SettingsLoading() {
  return (
    <main
      data-surface="app"
      className="mx-auto w-full max-w-2xl px-5 py-8"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <div className="skeleton mb-8 h-8 w-48" />

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="surface p-5"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="skeleton mb-4 h-4 w-40" />
            <div className="skeleton mb-2 h-10 w-full rounded-md" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        ))}
      </div>
    </main>
  );
}
