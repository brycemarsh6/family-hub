import { SkeletonPage } from "@/components/Skeleton";

// The print page never goes wide, so it keeps the plain app skeleton instead
// of inheriting the recipe page's wide two-column one from [id]/loading.tsx.
export default function Loading() {
  return <SkeletonPage />;
}
