import { SkeletonHeader, SkeletonBlock } from "@/components/Skeleton";

// The dashboard's own loading state — see src/components/Skeleton.tsx for
// why these exist at all. This can't just be app/(app)/loading.tsx's own
// SkeletonPage (a header + a list of rows): the dashboard is a 4-tile grid,
// not a list, and app/(app)/loading.tsx has to stay the generic catch-all
// for the other still-placeholder routes (calendar, chores, lists,
// settings) — reshaping it for the dashboard would mis-shape those. That's
// the whole reason this route lives in its own (home) route group: two
// loading.tsx files can't share one URL segment.
//
// Block sizes echo the real tile shapes on the page below: Today's meals is
// the tallest tile (it lists 4 meal slots), Inventory/Grocery are the two
// side-by-side tiles, and Recipes is a short single-line wide tile.
export default function Loading() {
  return (
    <div className="py-4" role="status" aria-label="Loading Marshee">
      <SkeletonHeader />
      <div className="mt-6 grid grid-cols-2 gap-4">
        <SkeletonBlock className="col-span-2 h-56" />
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="col-span-2 h-24" />
      </div>
    </div>
  );
}
