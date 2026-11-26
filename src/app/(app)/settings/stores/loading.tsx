import { SkeletonBlock, SkeletonHeader } from "@/components/Skeleton";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";

// The Stores page's shape: a title, then a short list of rows (decision 276).
export default function Loading() {
  return (
    <div className="py-2" data-page-width="wide" role="status" aria-label="Loading">
      <div className={NARROW_PAGE_CLASSES}>
        <SkeletonHeader />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
