import { SkeletonBlock } from "@/components/Skeleton";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/dashboardLayout";
import { DASHBOARD_CELL_CLASSES, DASHBOARD_GRID_CLASSES, gridAreaVars } from "@/lib/dashboardGrid";

// The dashboard's own loading state, see src/components/Skeleton.tsx for
// why these exist at all. This can't just be app/(app)/loading.tsx's own
// SkeletonPage (a header + a list of rows): the dashboard is a grid of
// widgets, not a list, and app/(app)/loading.tsx has to stay the generic
// catch-all for the other still-placeholder routes (habits, plans, lists;
// settings is real, and calendar has its own loading.tsx): reshaping it for
// the dashboard would mis-shape those. That's the whole reason this route
// lives in its own (home) route group: two loading.tsx files can't share one
// URL segment.
//
// The blocks follow the default layout through the same packer and the same
// CSS variables as DashboardWidgetList, at both column counts (container variants, as in the list; the grid and cell classes are
// DASHBOARD_GRID_CLASSES and DASHBOARD_CELL_CLASSES, shared with the list), with the same
// row rule (auto rows, 9.5rem minimum per cell, decision 209), so the
// skeleton's shape matches the real tiles. A person's saved layout can differ
// from the default; the grid still has the right shape. Re-check this if the grid's row height or gap changes.
export default function Loading() {
  const areas = gridAreaVars(DEFAULT_DASHBOARD_LAYOUT.widgets.map((widget) => widget.size));
  return (
    <div data-page-width="wide" className="py-4" role="status" aria-label="Loading Dashboard">
      <div className="@container">
        <div className={DASHBOARD_GRID_CLASSES}>
          {DEFAULT_DASHBOARD_LAYOUT.widgets.map((widget, i) => (
            <div
              key={widget.uid}
              style={areas[i] as React.CSSProperties}
              className={DASHBOARD_CELL_CLASSES}
            >
              <SkeletonBlock className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
