"use client";

import { useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";
import type { DashboardWidgetId } from "@/lib/dashboardWidgets";
import type { DashboardLayout } from "@/lib/dashboardLayout";
import { ToggleSwitch } from "./ToggleSwitch";

/**
 * The Customize sheet: one row per widget with an on/off switch and up and
 * down arrows, plus "Reset to default". Same chrome as RadioSheet (backdrop,
 * dialog, Escape, z-index). It holds no state of its own: every change is
 * handed to the dashboard list, which shows it at once and saves it.
 * `error` is the last failed save, shown inline so a miss is never silent.
 */
export default function DashboardCustomizeSheet({
  layout,
  error,
  onToggle,
  onMove,
  onReset,
  onClose,
}: {
  layout: DashboardLayout;
  error: string | null;
  onToggle: (id: DashboardWidgetId) => void;
  onMove: (id: DashboardWidgetId, direction: -1 | 1) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const title = "Customize dashboard";
  const last = layout.widgets.length - 1;

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

        <ul className="flex flex-col gap-1">
          {layout.widgets.map((widget, index) => {
            const { label } = DASHBOARD_WIDGETS[widget.id];
            return (
              <li
                key={widget.id}
                className="flex min-h-14 items-center gap-2 rounded-xl px-3"
              >
                <span className="min-w-0 flex-1 truncate text-base font-medium text-fg">
                  {label}
                </span>
                <ToggleSwitch
                  checked={widget.enabled}
                  onChange={() => onToggle(widget.id)}
                  label={`Show ${label}`}
                />
                <button
                  type="button"
                  aria-label={`Move ${label} up`}
                  disabled={index === 0}
                  onClick={() => onMove(widget.id, -1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg transition-colors active:bg-surface-2 disabled:text-muted disabled:opacity-40"
                >
                  <ChevronUp aria-hidden="true" size={20} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${label} down`}
                  disabled={index === last}
                  onClick={() => onMove(widget.id, 1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg transition-colors active:bg-surface-2 disabled:text-muted disabled:opacity-40"
                >
                  <ChevronDown aria-hidden="true" size={20} />
                </button>
              </li>
            );
          })}
        </ul>

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
