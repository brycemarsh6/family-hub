import { SkeletonPage } from "@/components/Skeleton";

// Covers every route under (app) that doesn't define its own loading state.
// See src/components/Skeleton.tsx for why these exist at all.
export default function Loading() {
  return <SkeletonPage />;
}
