"use client";

import { useOptimistic, useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import DashboardCustomizeSheet from "./DashboardCustomizeSheet";
import { EmptyState } from "./EmptyState";
import { saveDashboardLayout } from "@/app/actions/preferences";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  moveWidget,
  toggleWidget,
  widgetSpans,
} from "@/lib/dashboardLayout";
import type { DashboardLayout } from "@/lib/dashboardLayout";
import type { DashboardWidgetId } from "@/lib/dashboardWidgets";

/**
 * The dashboard's heading row, widget grid and Customize sheet. The page
 * renders every tile on the server and hands them in as `tiles`; this decides
 * which show, in what order and how wide (widgetSpans), from the person's
 * layout. `layout` must already have been through parseDashboardLayout.
 *
 * Every Customize change is optimistic: it shows at once and saves in the
 * background, and a failed save puts the old layout back and says so in the
 * sheet. Device sessions pass `canCustomize={false}` and get no button.
 */
export default function DashboardWidgetList({
  layout,
  tiles,
  canCustomize,
}: {
  layout: DashboardLayout;
  tiles: Record<DashboardWidgetId, React.ReactNode>;
  canCustomize: boolean;
}) {
  const [optimisticLayout, setOptimisticLayout] = useOptimistic(layout);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function change(next: DashboardLayout) {
    setError(null);
    startTransition(async () => {
      setOptimisticLayout(next);
      try {
        const result = await saveDashboardLayout(next);
        setError(result.error ?? null);
      } catch {
        setError("Couldn't save your dashboard. Check your connection and try again.");
      }
    });
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
          {spans.map(({ id, span }) => (
            <div key={id} className={`min-w-0 ${span === "full" ? "col-span-2" : ""}`}>
              {tiles[id]}
            </div>
          ))}
        </div>
      )}

      {open && canCustomize && (
        <DashboardCustomizeSheet
          layout={optimisticLayout}
          error={error}
          onToggle={(id) => change(toggleWidget(optimisticLayout, id))}
          onMove={(id, direction) => change(moveWidget(optimisticLayout, id, direction))}
          onReset={() => change(DEFAULT_DASHBOARD_LAYOUT)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
