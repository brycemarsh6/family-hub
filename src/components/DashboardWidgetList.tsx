"use client";

import { useOptimistic, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import DashboardCustomizeSheet from "./DashboardCustomizeSheet";
import type { PickItem } from "./DashboardItemPicker";
import { EmptyState } from "./EmptyState";
import { SkeletonBlock } from "./Skeleton";
import { saveDashboardLayout } from "@/app/actions/preferences";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  addWidget,
  removeWidget,
  reorderWidgets,
  resizeWidget,
  setWidgetItems,
} from "@/lib/dashboardLayout";
import { gridAreaVars } from "@/lib/dashboardGrid";
import { DASHBOARD_WIDGET_WORDS } from "@/lib/dashboardWidgets";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import type { DashboardLayout } from "@/lib/dashboardLayout";

/**
 * The dashboard's heading row, widget grid and Customize sheet. The page
 * renders every tile on the server and hands them in as `tiles`, keyed by
 * widget uid; this decides which show, in what order and how big, from the
 * person's layout. `layout` must already have been through parseDashboardLayout.
 *
 * The grid is 2 columns on phones and 4 from md up. The DOM stays in the
 * person's list order; each cell gets its row and column from the packer
 * (dashboardGrid.ts) through CSS custom properties, one pair per column count,
 * and rows are `auto` with a 9.5rem minimum per cell, so a tile is never cut and a lone Large fits its content (decision 209).
 *
 * Every Customize change (add, remove, resize, drag, picks, reset) is
 * optimistic through useOptimisticRun: it shows at once and saves in the
 * background, and a failed save puts the old layout back and says so in the
 * sheet. A widget added a moment ago has no tile until the server answers, so
 * it shows a skeleton block in its cell. Device sessions pass
 * `canCustomize={false}` and get no button.
 */
export default function DashboardWidgetList({
  layout,
  tiles,
  notes = null,
  pickable = { habits: [], goals: [] },
  canCustomize,
}: {
  layout: DashboardLayout;
  /** One tile per widget uid. A widget with no tile yet (just added) shows a skeleton until the server sends it. */
  tiles: Record<string, React.ReactNode>;
  /** Cards between the heading row and the grid (the nudge and Sunday cards, decision 139). */
  notes?: React.ReactNode;
  /** What the Habits and Goals pickers list (decision 137); empty for the tablet, which cannot customize. */
  pickable?: { habits: PickItem[]; goals: PickItem[] };
  canCustomize: boolean;
}) {
  const [optimisticLayout, setOptimisticLayout] = useOptimistic(layout);
  const [open, setOpen] = useState(false);
  const { run, error } = useOptimisticRun(setOptimisticLayout);

  function change(next: DashboardLayout) {
    run(next, () => saveDashboardLayout(next));
  }

  const { widgets } = optimisticLayout;
  const areas = gridAreaVars(widgets.map((widget) => widget.size));

  const customizeButton = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-fg transition-colors hover:border-accent active:bg-surface-2"
    >
      <SlidersHorizontal aria-hidden="true" size={18} />
      Customize
    </button>
  );

  return (
    <div className="py-4">
      {/* Not "Marshee": the wordmark is already in the header directly
          above this, and repeating it reads as a stutter. */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
        {canCustomize && customizeButton}
      </div>
      <p className="mt-2 text-base text-muted">What&apos;s going on around the house.</p>
      {notes && <div className="mt-4">{notes}</div>}

      {widgets.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            emoji="🧩"
            title={DASHBOARD_WIDGET_WORDS.emptyTitle}
            hint={DASHBOARD_WIDGET_WORDS.emptyHint}
          />
        </div>
      ) : (
        <div className="mt-6 grid auto-rows-auto grid-cols-2 gap-4 md:grid-cols-4">
          {widgets.map((widget, i) => (
            <div
              key={widget.uid}
              style={areas[i] as React.CSSProperties}
              className="min-h-[9.5rem] min-w-0 [grid-column:var(--dash-c2)] [grid-row:var(--dash-r2)] md:[grid-column:var(--dash-c4)] md:[grid-row:var(--dash-r4)]"
            >
              {tiles[widget.uid] ?? <SkeletonBlock className="h-full w-full" />}
            </div>
          ))}
        </div>
      )}

      {open && canCustomize && (
        <DashboardCustomizeSheet
          layout={optimisticLayout}
          pickable={pickable}
          error={error}
          onAdd={(kind, size) => change(addWidget(optimisticLayout, kind, size))}
          onRemove={(uid) => change(removeWidget(optimisticLayout, uid))}
          onResize={(uid, size) => change(resizeWidget(optimisticLayout, uid, size))}
          onReorder={(uids) => change(reorderWidgets(optimisticLayout, uids))}
          onPicks={(uid, ids) => change(setWidgetItems(optimisticLayout, uid, ids))}
          onReset={() => change(DEFAULT_DASHBOARD_LAYOUT)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
