"use client";

import { useOptimistic, useState } from "react";
import { createPortal } from "react-dom";
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
  setWidgetOptions,
} from "@/lib/dashboardLayout";
import { DASHBOARD_CELL_CLASSES, DASHBOARD_GRID_CLASSES, gridAreaVars } from "@/lib/dashboardGrid";
import { useWordmarkHeaderActionsTarget } from "@/lib/appChrome";
import { DASHBOARD_WIDGET_WORDS } from "@/lib/dashboardWidgets";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import type { DashboardLayout } from "@/lib/dashboardLayout";

/**
 * The dashboard's widget grid and Customize sheet. The page
 * renders every tile on the server and hands them in as `tiles`, keyed by
 * widget uid; this decides which show, in what order and how big, from the
 * person's layout. `layout` must already have been through parseDashboardLayout.
 *
 * The page is wide (`data-page-width="wide"`, see AppChrome.tsx), with no
 * title of its own (decision 221). The grid is 2 columns, and 4 from a 45rem
 * container width (`DASHBOARD_GRID_CLASSES`, shared with the home skeleton), not a screen breakpoint, so the Sidebar menu or a
 * different iPad shrinks it correctly. The notes cards above the grid (planned
 * today, pick a day, nudges) sit two across from the same container width, so
 * a row never stretches across the iPad (decision 224). The `@container`
 * element wraps only columns: older engines made a container the positioning
 * parent of fixed descendants, so the Customize sheet stays outside it, as
 * its sibling. The Customize
 * button is portaled into the wordmark header's right end
 * (WORDMARK_HEADER_ACTIONS_ID); with no slot it renders nowhere. The DOM stays in the
 * person's list order; each cell gets its row and column from the packer
 * (dashboardGrid.ts) through CSS custom properties, one pair per column count,
 * and rows are `auto` with a 9.5rem minimum per cell, so a tile is never cut and a lone Large fits its content (decision 209).
 *
 * Every Customize change (add, remove, resize, drag, picks, options, reset) is
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

  const headerSlot = useWordmarkHeaderActionsTarget();

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
    <div data-page-width="wide" className="py-4">
      {canCustomize && headerSlot && createPortal(customizeButton, headerSlot)}
      {notes && (
        <div className="@container mb-1">
          <div className="grid items-start gap-x-4 @min-[45rem]:grid-cols-2">
            {notes}
          </div>
        </div>
      )}

      <div className="@container">
        {widgets.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              emoji="🧩"
              title={DASHBOARD_WIDGET_WORDS.emptyTitle}
              hint={DASHBOARD_WIDGET_WORDS.emptyHint}
            />
          </div>
        ) : (
          <div className={DASHBOARD_GRID_CLASSES}>
            {widgets.map((widget, i) => (
              <div
                key={widget.uid}
                style={areas[i] as React.CSSProperties}
                className={DASHBOARD_CELL_CLASSES}
              >
                {tiles[widget.uid] ?? <SkeletonBlock className="h-full w-full" />}
              </div>
            ))}
          </div>
        )}
      </div>

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
          onOptions={(uid, patch) => change(setWidgetOptions(optimisticLayout, uid, patch))}
          onReset={() => change(DEFAULT_DASHBOARD_LAYOUT)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
