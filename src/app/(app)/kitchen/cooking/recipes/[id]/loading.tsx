import { SkeletonBlock } from "@/components/Skeleton";

// Shaped like the page: header row, title, then Ingredients beside the steps. edit/ has its own form-shaped skeleton; print/ has its own plain skeleton.
export default function Loading() {
  return (
    <div className="py-2" data-page-width="wide" role="status" aria-label="Loading">
      <SkeletonBlock className="mb-4 h-11 w-full" />
      <SkeletonBlock className="mb-6 h-9 w-64" />
      <div className="@container">
        <div className="flex flex-col gap-5 @min-[48rem]:grid @min-[48rem]:grid-cols-[25rem_minmax(0,1fr)]">
          <SkeletonBlock className="h-96 w-full rounded-2xl" />
          <SkeletonBlock className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
