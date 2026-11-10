import { SkeletonHeader, SkeletonList } from "@/components/Skeleton";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";

// A short page is wide and centered at 40rem (decision 276).
export default function Loading() {
  return (
    <div className="py-2" data-page-width="wide" role="status" aria-label="Loading">
      <div className={NARROW_PAGE_CLASSES}>
        <SkeletonHeader />
        <SkeletonList />
        <SkeletonList />
        <SkeletonList />
      </div>
    </div>
  );
}
