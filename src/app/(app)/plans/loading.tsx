import { SkeletonBlock, SkeletonHeader, SkeletonList } from "@/components/Skeleton";

// Shaped like the page: heading, the tab bar, then a few cards.
export default function Loading() {
  return (
    <div className="py-2" role="status" aria-label="Loading">
      <SkeletonHeader />
      <SkeletonBlock className="mb-4 h-12 w-full rounded-2xl" />
      <SkeletonList rows={3} />
    </div>
  );
}
