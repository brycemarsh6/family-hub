import { SkeletonBlock, SkeletonHeader } from "@/components/Skeleton";

// Shaped like the page: heading, the tab bar, then cards in the same two columns as This week.
export default function Loading() {
  return (
    <div className="py-2" data-page-width="wide" role="status" aria-label="Loading">
      <SkeletonHeader />
      <SkeletonBlock className="mb-4 h-12 w-full rounded-2xl" />
      <div className="@container">
        <div className="grid grid-cols-1 gap-3 @min-[48rem]:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonBlock key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
