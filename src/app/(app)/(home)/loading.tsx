import { SkeletonBlock } from "@/components/Skeleton";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/dashboardLayout";
import { gridAreaVars } from "@/lib/dashboardGrid";

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
// CSS variables as DashboardWidgetList, at both column counts, with the same
// row rule (auto rows, 9.5rem minimum per cell, decision 209), so the page does not jump when the real tiles land. A person's
// saved layout can differ from the default; the grid still has the right
// shape. Re-check this if the grid's row height or gap changes.
export default function Loading() {
  const areas = gridAreaVars(DEFAULT_DASHBOARD_LAYOUT.widgets.map((widget) => widget.size));
  return (
    <div className="py-4" role="status" aria-label="Loading Dashboard">
      {/* Same shape as SkeletonHeader, plus the Customize button's block right of the title. */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-11 w-[123px] rounded-xl" />
        </div>
        <SkeletonBlock className="mt-2 h-6 w-56" />
      </div>
      <div className="mt-6 grid auto-rows-auto grid-cols-2 gap-4 md:grid-cols-4">
        {DEFAULT_DASHBOARD_LAYOUT.widgets.map((widget, i) => (
          <div
            key={widget.uid}
            style={areas[i] as React.CSSProperties}
            className="min-h-[9.5rem] min-w-0 [grid-column:var(--dash-c2)] [grid-row:var(--dash-r2)] md:[grid-column:var(--dash-c4)] md:[grid-row:var(--dash-r4)]"
          >
            <SkeletonBlock className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
