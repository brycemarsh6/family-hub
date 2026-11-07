"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardWidgetGallery from "./DashboardWidgetGallery";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_KINDS,
  DASHBOARD_WIDGET_WORDS,
} from "@/lib/dashboardWidgets";
import type { DashboardWidgetKind, WidgetSize } from "@/lib/dashboardWidgets";

/**
 * The two Add views inside the Customize sheet (decisions 205, 206). With no
 * `kind`: "Add a widget", every kind as a 56px row, a muted "On your
 * dashboard" line under a kind that is already there (it can still be added
 * again). With a `kind`: its name, the Size gallery with the default size
 * selected, and a 48px "Add widget" button that adds it at the end. A body
 * for the sheet; the chosen size is the only state, and the sheet saves the add.
 */
export default function DashboardAddWidget({
  kind,
  onDashboard,
  onKind,
  onAdd,
  onBack,
  onClose,
}: {
  /** The kind being added, or null for the list of kinds. */
  kind: DashboardWidgetKind | null;
  /** Kinds that already have a widget. */
  onDashboard: ReadonlySet<DashboardWidgetKind>;
  onKind: (kind: DashboardWidgetKind) => void;
  onAdd: (kind: DashboardWidgetKind, size: WidgetSize) => void;
  /** From the kind view this goes back to the list of kinds; from the list, back to Customize. */
  onBack: () => void;
  onClose: () => void;
}) {
  // Re-chosen for each kind: the sheet remounts this view per kind (key), so it starts at the default.
  const [size, setSize] = useState<WidgetSize | null>(null);
  const title = kind ? DASHBOARD_WIDGETS[kind].label : DASHBOARD_WIDGET_WORDS.addTitle;

  return (
    <>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label={kind ? DASHBOARD_WIDGET_WORDS.backToAdd : DASHBOARD_WIDGET_WORDS.backToCustomize}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg transition-colors active:bg-surface-2"
        >
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
        >
          ×
        </button>
      </div>

      {kind ? (
        <>
          <h3 className="mt-2 mb-1 px-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {DASHBOARD_WIDGET_WORDS.size}
          </h3>
          <DashboardWidgetGallery
            kind={kind}
            selected={size ?? DASHBOARD_WIDGETS[kind].defaultSize}
            onSelect={setSize}
          />
          <button
            type="button"
            onClick={() => onAdd(kind, size ?? DASHBOARD_WIDGETS[kind].defaultSize)}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
          >
            {DASHBOARD_WIDGET_WORDS.addWidget}
          </button>
        </>
      ) : (
        <ul className="flex flex-col gap-1">
          {DASHBOARD_WIDGET_KINDS.map((k) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => onKind(k)}
                className="flex min-h-14 w-full items-center gap-2 rounded-xl px-3 text-left transition-colors active:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-fg">{DASHBOARD_WIDGETS[k].label}</span>
                  {onDashboard.has(k) && (
                    <span className="block text-sm text-muted">{DASHBOARD_WIDGET_WORDS.onDashboard}</span>
                  )}
                </span>
                <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
