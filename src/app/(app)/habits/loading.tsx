import { SkeletonBlock } from "@/components/Skeleton";

// The Habits & Chores loading state (mission 51): the bar, then the columns at
// the same container widths as the real list (1, 2 or 4 across). One file
// covers /habits and its children, none of which has its own.
export default function Loading() {
  return (
    <div data-page-width="wide" className="py-2" role="status" aria-label="Loading Habits & Chores">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="mt-2 h-4 w-40" />
        </div>
        <SkeletonBlock className="h-11 w-72" />
      </div>
      <div className="@container">
        <div className="grid grid-cols-1 gap-3.5 @min-[40rem]:grid-cols-2 @min-[60rem]:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
