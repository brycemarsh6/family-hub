import { SkeletonList, SkeletonPage } from "@/components/Skeleton";
import { TWO_COLUMN_CLASSES } from "@/lib/gridClasses";

// Exists so this page is wide from the first paint; the shared
// (app)/loading.tsx stays narrow for /lists and /login. It also covers Manage family.
export default function Loading() {
  return (
    <SkeletonPage wide>
      <div className="@container">
        <div className={TWO_COLUMN_CLASSES}>
          <SkeletonList rows={3} />
          <SkeletonList rows={3} />
        </div>
      </div>
    </SkeletonPage>
  );
}
