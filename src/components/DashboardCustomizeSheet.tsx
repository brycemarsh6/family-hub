"use client";

import { useEffect, useState } from "react";
import DashboardItemPicker from "./DashboardItemPicker";
import type { PickItem } from "./DashboardItemPicker";
import { SortableList } from "./SortableList";
import { ToggleSwitch } from "./ToggleSwitch";
import { DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";
import type { DashboardWidgetId } from "@/lib/dashboardWidgets";
import type { DashboardLayout } from "@/lib/dashboardLayout";
import { picksOf } from "@/lib/dashboardPicks";
import { GOALS_PICKER_NONE, GOALS_PICKER_NOTHING_PICKED, GOALS_PICKER_TITLE } from "@/lib/goalVocabulary";
import {
  DASHBOARD_PICKER_LABELS,
  HABITS_PICKER_NONE,
  HABITS_PICKER_NOTHING_PICKED,
  HABITS_PICKER_TITLE,
} from "@/lib/habitVocabulary";

/** The widgets whose rows have a "Pick" button, with the picker's words (decision 137). */
const PICKERS = {
  habits: { title: HABITS_PICKER_TITLE, nothingPicked: HABITS_PICKER_NOTHING_PICKED, none: HABITS_PICKER_NONE },
  goals: { title: GOALS_PICKER_TITLE, nothingPicked: GOALS_PICKER_NOTHING_PICKED, none: GOALS_PICKER_NONE },
} as const;
type PickerId = keyof typeof PICKERS;

/**
 * The Customize sheet: one row per widget with an on/off switch and a grip to
 * drag it into place (decision 140), plus "Reset to default". The Habits and
 * Goals rows also have a "Pick" button that swaps this sheet's body for the
 * picker (decision 137): one sheet with a back control, never a second sheet.
 * Same chrome as RadioSheet (backdrop, dialog, Escape, z-index). Apart from
 * which view is open it holds no state: every change is handed to the
 * dashboard list, which shows it at once and saves it. `error` is the last
 * failed save, shown inline so a miss is never silent.
 */
export default function DashboardCustomizeSheet({
  layout,
  pickable,
  error,
  onToggle,
  onReorder,
  onPicks,
  onReset,
  onClose,
}: {
  layout: DashboardLayout;
  /** What each picker can list: the person's habits and open goals. */
  pickable: Record<PickerId, PickItem[]>;
  error: string | null;
  onToggle: (id: DashboardWidgetId) => void;
  onReorder: (ids: string[]) => void;
  onPicks: (id: PickerId, ids: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [picker, setPicker] = useState<PickerId | null>(null);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const title = "Customize dashboard";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {picker ? (
          <DashboardItemPicker
            {...PICKERS[picker]}
            items={pickable[picker]}
            picks={picksOf(layout, picker)}
            onChange={(ids) => onPicks(picker, ids)}
            onBack={() => setPicker(null)}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
              >
                ×
              </button>
            </div>

            <SortableList
              items={layout.widgets}
              label={(widget) => DASHBOARD_WIDGETS[widget.id].label}
              onReorder={onReorder}
              className="flex flex-col gap-1"
              itemClassName="flex min-h-14 items-center gap-2 rounded-xl px-3"
              renderItem={(widget, { grip }) => {
                const { label } = DASHBOARD_WIDGETS[widget.id];
                return (
                  <>
                    <span className="min-w-0 flex-1 truncate text-base font-medium text-fg">{label}</span>
                    {(widget.id === "habits" || widget.id === "goals") && (
                      <button
                        type="button"
                        onClick={() => setPicker(widget.id as PickerId)}
                        aria-label={`${DASHBOARD_PICKER_LABELS.pick} ${label}`}
                        className="flex min-h-11 shrink-0 items-center rounded-xl border border-line px-3 text-sm font-medium text-fg transition-colors active:bg-surface-2"
                      >
                        {DASHBOARD_PICKER_LABELS.pick}
                      </button>
                    )}
                    <ToggleSwitch
                      checked={widget.enabled}
                      onChange={() => onToggle(widget.id)}
                      label={`Show ${label}`}
                    />
                    {grip}
                  </>
                );
              }}
            />
          </>
        )}

        {error && (
          <p role="alert" className="mt-2 px-3 text-sm text-warn">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onReset}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-line text-base font-medium text-fg transition-colors active:bg-surface-2"
        >
          Reset to default
        </button>
      </div>
    </div>
  );
}
