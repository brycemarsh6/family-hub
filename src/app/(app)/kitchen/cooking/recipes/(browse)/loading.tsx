import { SkeletonPage } from "@/components/Skeleton";

// Exists so this page is wide from the first paint; the shared
// (app)/loading.tsx stays narrow for pages not yet adapted.
export default function Loading() {
  return <SkeletonPage wide />;
}
