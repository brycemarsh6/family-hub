"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardWidgetGallery from "./DashboardWidgetGallery";
import { Segmented } from "./HabitFormFields";
import { ToggleSwitch } from "./ToggleSwitch";
import type { DashboardWidget } from "@/lib/dashboardLayout";
import { calendarOptionsOf } from "@/lib/dashboardWidgetOptions";
import type { DashboardWidgetOptions } from "@/lib/dashboardWidgetOptions";
import {
  CALENDAR_WIDGET_WORDS,
  DASHBOARD_PICKER_LABELS,
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_WORDS,
  isPickableWidget,
} from "@/lib/dashboardWidgets";
import type { WidgetSize } from "@/lib/dashboardWidgets";

/**
 * The edit view inside the Customize sheet for one widget (decisions 204,
 * 206): a back control, the widget's name, the Size gallery (a tap saves at
 * once), the Calendar's Options (switches and a Days strip, each saved at
 * once), "Pick" for the kinds that have picks, and "Remove widget" (one tap,
 * no confirmation). A body for the sheet, not a sheet of its own, and it holds
 * no state: every tap is handed up and the dashboard saves it.
 */
export default function DashboardWidgetEditor({
  widget,
  onResize,
  onOptions,
  onPick,
  onRemove,
  onBack,
  onClose,
}: {
  widget: DashboardWidget;
  onResize: (size: WidgetSize) => void;
  onOptions: (patch: DashboardWidgetOptions) => void;
  onPick: () => void;
  onRemove: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const { label } = DASHBOARD_WIDGETS[widget.kind];
  return (
    <>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label={DASHBOARD_WIDGET_WORDS.backToCustomize}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg transition-colors active:bg-surface-2"
        >
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{label}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
        >
          ×
        </button>
      </div>

      <h3 className="mt-2 mb-1 px-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {DASHBOARD_WIDGET_WORDS.size}
      </h3>
      <DashboardWidgetGallery kind={widget.kind} selected={widget.size} onSelect={onResize} />

      {widget.kind === "calendar" && <CalendarOptions widget={widget} onOptions={onOptions} />}

      {isPickableWidget(widget.kind) && (
        <button
          type="button"
          onClick={onPick}
          className="mt-3 flex h-12 w-full items-center justify-between rounded-xl border border-line px-4 text-base font-medium text-fg transition-colors active:bg-surface-2"
        >
          {DASHBOARD_PICKER_LABELS.pick}
          <ChevronRight aria-hidden="true" size={18} className="text-muted" />
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-line text-base font-medium text-danger transition-colors active:bg-surface-2"
      >
        {DASHBOARD_WIDGET_WORDS.removeWidget}
      </button>
    </>
  );
}

/** The Calendar widget's Options (decisions 235, 238): two switches, and Days only while Extra large. */
function CalendarOptions({
  widget,
  onOptions,
}: {
  widget: DashboardWidget;
  onOptions: (patch: DashboardWidgetOptions) => void;
}) {
  const options = calendarOptionsOf(widget);
  const rows = [
    { key: "tasksOnly", label: CALENDAR_WIDGET_WORDS.tasksOnly, checked: options.tasksOnly },
    { key: "wholeDay", label: CALENDAR_WIDGET_WORDS.wholeDay, checked: options.wholeDay },
  ] as const;
  return (
    <>
      <h3 className="mt-4 mb-1 px-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {CALENDAR_WIDGET_WORDS.options}
      </h3>
      {rows.map((row) => (
        <div key={row.key} className="flex min-h-14 items-center justify-between gap-3 rounded-xl px-3">
          <span className="min-w-0 text-base font-medium text-fg">{row.label}</span>
          <ToggleSwitch checked={row.checked} label={row.label} onChange={(next) => onOptions({ [row.key]: next })} />
        </div>
      ))}
      {widget.size === "xl" && (
        <div className="mt-1 px-3">
          <p className="mb-1 text-base font-medium text-fg">{CALENDAR_WIDGET_WORDS.days}</p>
          <Segmented
            label={CALENDAR_WIDGET_WORDS.days}
            value={String(options.days) as "3" | "7"}
            options={[
              { key: "3", label: CALENDAR_WIDGET_WORDS.days3 },
              { key: "7", label: CALENDAR_WIDGET_WORDS.days7 },
            ]}
            onChange={(next) => onOptions({ days: next === "7" ? 7 : 3 })}
          />
        </div>
      )}
    </>
  );
}
