// Placeholder shapes shown while a page's data is still on its way.
//
// These exist because every page in this app is `force-dynamic` — counts
// and low-stock badges must never be stale — which means a navigation
// can't render anything until the server has finished querying. Without a
// loading state the app looks frozen for the whole round trip; with one,
// the shell appears instantly and the real data swaps in underneath.
//
// Deliberately grey blocks rather than spinners: they show the *shape* of
// what's coming, so the page doesn't visibly jump when the data lands.

/** One shimmering grey block. `className` sets its size. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-surface-2 ${className}`}
    />
  );
}

/** The title + subtitle every page opens with. */
export function SkeletonHeader() {
  return (
    <div className="mb-4">
      <SkeletonBlock className="h-8 w-40" />
      <SkeletonBlock className="mt-2 h-4 w-56" />
    </div>
  );
}

/** A stand-in for a list of rows — Inventory, Shopping, Expiring. */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

/** A stand-in for a branch landing page's 2-column tile grid. */
export function SkeletonTiles({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4">
      {Array.from({ length: tiles }, (_, i) => (
        <SkeletonBlock key={i} className="min-h-36" />
      ))}
    </div>
  );
}

/**
 * The whole screen, for routes with no more specific skeleton. Announced
 * politely to screen readers so the wait isn't silent for anyone using one.
 */
export function SkeletonPage({ children }: { children?: React.ReactNode }) {
  return (
    <div className="py-2" role="status" aria-label="Loading">
      <SkeletonHeader />
      {children ?? <SkeletonList />}
    </div>
  );
}
