"use client";

import { useOptimistic, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import DashboardCustomizeSheet from "./DashboardCustomizeSheet";
import type { PickItem } from "./DashboardItemPicker";
import { EmptyState } from "./EmptyState";
import { saveDashboardLayout } from "@/app/actions/preferences";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  reorderWidgets,
  setWidgetItems,
  toggleWidget,
  widgetSpans,
} from "@/lib/dashboardLayout";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import type { DashboardLayout } from "@/lib/dashboardLayout";
import type { DashboardWidgetId } from "@/lib/dashboardWidgets";

/**
 * The dashboard's heading row, widget grid and Customize sheet. The page
 * renders every tile on the server and hands them in as `tiles`; this decides
 * which show, in what order and how wide (widgetSpans), from the person's
 * layout. `layout` must already have been through parseDashboardLayout.
 *
 * Every Customize change (switch, drag, picks, reset) is optimistic through
 * useOptimisticRun: it shows at once and saves in the background, and a failed
 * save puts the old layout back and says so in the sheet. Device sessions pass `canCustomize={false}` and get no button.
 */
export default function DashboardWidgetList({
  layout,
  tiles,
  notes = null,
  pickable = { habits: [], goals: [] },
  canCustomize,
}: {
  layout: DashboardLayout;
  /** A tile that is null leaves no grid cell (the tablet has no Habits or Chores tile). */
  tiles: Record<DashboardWidgetId, React.ReactNode>;
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

  const spans = widgetSpans(optimisticLayout);

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

      {spans.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            emoji="🧩"
            title="Your dashboard is empty."
            hint="Tap Customize to turn widgets back on."
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {spans.map(({ id, span }) =>
            tiles[id] == null ? null : (
              <div key={id} className={`min-w-0 ${span === "full" ? "col-span-2" : ""}`}>
                {tiles[id]}
              </div>
            ),
          )}
        </div>
      )}

      {open && canCustomize && (
        <DashboardCustomizeSheet
          layout={optimisticLayout}
          pickable={pickable}
          error={error}
          onToggle={(id) => change(toggleWidget(optimisticLayout, id))}
          onReorder={(ids) => change(reorderWidgets(optimisticLayout, ids))}
          onPicks={(id, ids) => change(setWidgetItems(optimisticLayout, id, ids))}
          onReset={() => change(DEFAULT_DASHBOARD_LAYOUT)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
