import { SkeletonBlock, SkeletonHeader } from "@/components/Skeleton";
import { FORM_COLUMN_CLASSES, FORM_GRID_CLASSES } from "@/lib/gridClasses";

// Shaped like the edit form: header, then two columns of fields from 48rem.
// A plain div, not a form: the grid's variants need a container ancestor.
export default function Loading() {
  return (
    <div className="py-2" data-page-width="wide" role="status" aria-label="Loading">
      <SkeletonHeader />
      <div className="@container">
        <div className={FORM_GRID_CLASSES}>
          <div className={FORM_COLUMN_CLASSES}>
            <SkeletonBlock className="h-96 w-full rounded-2xl" />
          </div>
          <div className={FORM_COLUMN_CLASSES}>
            <SkeletonBlock className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
