import { SkeletonHeader, SkeletonTiles } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="py-4" role="status" aria-label="Loading Cooking">
      <SkeletonHeader />
      <SkeletonTiles tiles={2} />
    </div>
  );
}
