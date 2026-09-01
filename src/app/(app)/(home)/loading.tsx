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
// Block heights are the tiles' real measured heights at 375px, not
// eyeballed: a skeleton that's the wrong size doesn't just look off, it
// makes the page jump when content lands, which is the exact problem
// skeletons exist to prevent. The first version guessed h-56 (224px) for a
// tile that renders at 164px and the whole page snapped up ~60px on every
// load. Re-measure these if a tile's contents change shape.
export default function Loading() {
  return (
    <div className="py-4" role="status" aria-label="Loading Dashboard">
      <SkeletonHeader />
      <div className="mt-6 grid grid-cols-2 gap-4">
        <SkeletonBlock className="col-span-2 h-[164px]" /> {/* Today's meals */}
        <SkeletonBlock className="h-[182px]" /> {/* Inventory */}
        <SkeletonBlock className="h-[182px]" /> {/* Grocery */}
        <SkeletonBlock className="col-span-2 h-[108px]" /> {/* Recipes */}
      </div>
    </div>
  );
}
