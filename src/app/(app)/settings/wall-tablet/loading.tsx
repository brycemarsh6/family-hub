import { SkeletonBlock, SkeletonHeader, SkeletonList } from "@/components/Skeleton";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";

// A short page is wide and centered at 40rem (decision 276).
export default function Loading() {
  return (
    <div className="py-2" data-page-width="wide" role="status" aria-label="Loading">
      <div className={NARROW_PAGE_CLASSES}>
        <SkeletonHeader />
        <SkeletonBlock className="h-11 w-24" />
        <SkeletonList rows={1} />
        <div className="mt-6">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonList rows={3} />
        </div>
        <div className="mt-6">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonList rows={3} />
        </div>
        <div className="mt-6">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonList rows={4} />
        </div>
      </div>
    </div>
  );
}
