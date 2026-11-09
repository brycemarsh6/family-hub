import { SkeletonBlock, SkeletonList, SkeletonPage } from "@/components/Skeleton";

// 64rem is COLUMN_MIN_WIDTH_PX[3]; this must change with FeedbackList's measured split.
export default function Loading() {
  return (
    <SkeletonPage wide>
      <div className="@container">
        <div className="grid grid-cols-1 @min-[64rem]:grid-cols-[30rem_minmax(0,1fr)] @min-[64rem]:items-start @min-[64rem]:gap-x-8">
          <SkeletonList />
          <SkeletonBlock className="hidden h-96 w-full rounded-2xl @min-[64rem]:block" />
        </div>
      </div>
    </SkeletonPage>
  );
}
