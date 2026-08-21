export default function PricingLoading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 py-16"
      aria-busy="true"
      aria-label="Loading plans"
    >
      <div className="mx-auto mb-12 max-w-md space-y-3 text-center">
        <div className="skeleton mx-auto h-9 w-64" />
        <div className="skeleton mx-auto h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="surface p-6"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="skeleton mb-3 h-4 w-20" />
            <div className="skeleton mb-6 h-10 w-28" />
            <div className="skeleton mb-6 h-11 w-full rounded-md" />
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((__, line) => (
                <div key={line} className="skeleton h-3 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
