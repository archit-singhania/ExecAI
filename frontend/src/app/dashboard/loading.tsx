/**
 * Route-level loading state for /dashboard.
 *
 * Shaped like the real metro home (header bar + tile grid) rather than a
 * spinner, so the layout does not jump when data arrives. Skeleton styling
 * comes from .skeleton in src/styles/premium.css.
 */
export default function DashboardLoading() {
  return (
    <main
      data-surface="app"
      className="relative flex h-[100dvh] min-h-[560px] overflow-hidden bg-radial-ui p-2.5 sm:p-3.5 lg:p-4"
      aria-busy="true"
      aria-label="Loading your dashboard"
    >
      <div className="flex h-full w-full flex-col gap-3">
        <div className="mh-bar flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-[30px] w-[30px] rounded-md" />
            <div className="skeleton h-9 w-9 rounded-md" />
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-2.5 w-40" />
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <div className="skeleton h-7 w-24 rounded-full" />
            <div className="skeleton h-7 w-20 rounded-full" />
            <div className="skeleton h-7 w-20 rounded-full" />
          </div>
        </div>

        <div className="mh-deck min-h-0 flex-1 rounded-xl p-2 sm:p-3">
          <div className="mh-grid">
            <div className="skeleton col-span-2 row-span-2 rounded-md" />
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="skeleton rounded-md"
                style={{ animationDelay: `${index * 60}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
