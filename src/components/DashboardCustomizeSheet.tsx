"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import DashboardAddWidget from "./DashboardAddWidget";
import DashboardItemPicker from "./DashboardItemPicker";
import type { PickItem } from "./DashboardItemPicker";
import DashboardWidgetEditor from "./DashboardWidgetEditor";
import { SortableList } from "./SortableList";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_WORDS,
  MAX_DASHBOARD_WIDGETS,
  WIDGET_SIZE_LABELS,
  isPickableWidget,
} from "@/lib/dashboardWidgets";
import type { DashboardWidgetKind, PickableWidgetId, WidgetSize } from "@/lib/dashboardWidgets";
import type { DashboardLayout } from "@/lib/dashboardLayout";
import { picksOf } from "@/lib/dashboardPicks";
import { GOALS_PICKER_NONE, GOALS_PICKER_NOTHING_PICKED, GOALS_PICKER_TITLE } from "@/lib/goalVocabulary";
import {
  HABITS_PICKER_NONE,
  HABITS_PICKER_NOTHING_PICKED,
  HABITS_PICKER_TITLE,
} from "@/lib/habitVocabulary";

/** The kinds with a "Pick" button, with the picker's words (decision 137). */
const PICKERS: Record<PickableWidgetId, { title: string; nothingPicked: string; none: string }> = {
  habits: { title: HABITS_PICKER_TITLE, nothingPicked: HABITS_PICKER_NOTHING_PICKED, none: HABITS_PICKER_NONE },
  goals: { title: GOALS_PICKER_TITLE, nothingPicked: GOALS_PICKER_NOTHING_PICKED, none: GOALS_PICKER_NONE },
};

/** Which body the sheet shows. One state, so the sheet is one dialog and never a stack of them. */
type View =
  | { name: "list" }
  | { name: "edit"; uid: string }
  | { name: "pick"; uid: string }
  | { name: "add" }
  | { name: "addKind"; kind: DashboardWidgetKind };

/**
 * The Customize sheet: a list of the dashboard's widgets (name, size under it,
 * a grip to drag, tap to edit), "Add widget" and "Reset to default". Edit,
 * Pick, Add and the Add kind view swap this sheet's body (decisions 137, 206,
 * 208): one sheet with a back control, never a second sheet. Same chrome as
 * RadioSheet (backdrop, dialog, Escape, z-index). Apart from which view is
 * open it holds no state: every change is handed to the dashboard list, which
 * shows it at once and saves it. `error` is the last failed save, shown
 * inline so a miss is never silent.
 */
export default function DashboardCustomizeSheet({
  layout,
  pickable,
  error,
  onAdd,
  onRemove,
  onResize,
  onReorder,
  onPicks,
  onReset,
  onClose,
}: {
  layout: DashboardLayout;
  /** What each picker can list: the person's habits and open goals. */
  pickable: Record<PickableWidgetId, PickItem[]>;
  error: string | null;
  onAdd: (kind: DashboardWidgetKind, size: WidgetSize) => void;
  onRemove: (uid: string) => void;
  onResize: (uid: string, size: WidgetSize) => void;
  onReorder: (uids: string[]) => void;
  onPicks: (uid: string, ids: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>({ name: "list" });
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // An edit or pick view whose widget is gone (removed, or reset away) falls back to the list.
  const target = view.name === "edit" || view.name === "pick" ? layout.widgets.find((w) => w.uid === view.uid) : undefined;
  const gone = (view.name === "edit" || view.name === "pick") && !target;
  const showing: View = gone ? { name: "list" } : view;
  // Reset the stored view too, so the widget coming back (undo, a failed save) does not reopen a stale edit view.
  if (gone) setView({ name: "list" });
  const toList = () => setView({ name: "list" });
  const full = layout.widgets.length >= MAX_DASHBOARD_WIDGETS;

  const title =
    target && showing.name === "edit"
      ? DASHBOARD_WIDGETS[target.kind].label
      : target && showing.name === "pick" && isPickableWidget(target.kind)
        ? PICKERS[target.kind].title
        : showing.name === "add"
          ? DASHBOARD_WIDGET_WORDS.addTitle
          : showing.name === "addKind"
            ? DASHBOARD_WIDGETS[showing.kind].label
            : DASHBOARD_WIDGET_WORDS.customizeTitle;

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
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl [&>*]:shrink-0 bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {showing.name === "pick" && target && isPickableWidget(target.kind) ? (
          <DashboardItemPicker
            {...PICKERS[target.kind]}
            items={pickable[target.kind]}
            picks={picksOf(target)}
            onChange={(ids) => onPicks(target.uid, ids)}
            backLabel={DASHBOARD_WIDGET_WORDS.backTo(DASHBOARD_WIDGETS[target.kind].label)}
            onBack={() => setView({ name: "edit", uid: target.uid })}
            onClose={onClose}
          />
        ) : showing.name === "edit" && target ? (
          <DashboardWidgetEditor
            widget={target}
            onResize={(size) => onResize(target.uid, size)}
            onPick={() => setView({ name: "pick", uid: target.uid })}
            onRemove={() => {
              onRemove(target.uid);
              toList();
            }}
            onBack={toList}
            onClose={onClose}
          />
        ) : showing.name === "add" || showing.name === "addKind" ? (
          <DashboardAddWidget
            key={showing.name === "addKind" ? showing.kind : "kinds"}
            kind={showing.name === "addKind" ? showing.kind : null}
            onDashboard={new Set(layout.widgets.map((w) => w.kind))}
            onKind={(kind) => setView({ name: "addKind", kind })}
            onAdd={(kind, size) => {
              onAdd(kind, size);
              toList();
            }}
            onBack={() => (showing.name === "addKind" ? setView({ name: "add" }) : toList())}
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
              items={layout.widgets.map((widget) => ({ ...widget, id: widget.uid }))}
              label={(widget) => DASHBOARD_WIDGETS[widget.kind].label}
              onReorder={onReorder}
              className="flex flex-col gap-1"
              itemClassName="flex min-h-14 items-center gap-1 rounded-xl px-3"
              renderItem={(widget, { grip }) => (
                <>
                  <button
                    type="button"
                    onClick={() => setView({ name: "edit", uid: widget.uid })}
                    className="-ml-2 flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-xl pl-2 text-left transition-colors active:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-fg">
                        {DASHBOARD_WIDGETS[widget.kind].label}
                      </span>
                      <span className="block text-sm text-muted">{WIDGET_SIZE_LABELS[widget.size]}</span>
                    </span>
                    <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
                  </button>
                  {grip}
                </>
              )}
            />

            <button
              type="button"
              onClick={() => setView({ name: "add" })}
              disabled={full}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
            >
              {DASHBOARD_WIDGET_WORDS.addWidget}
            </button>
            {full && <p className="mt-2 px-3 text-sm text-muted">{DASHBOARD_WIDGET_WORDS.full}</p>}
          </>
        )}

        {error && (
          <p role="alert" className="mt-2 px-3 text-sm text-warn">
            {error}
          </p>
        )}

        {showing.name === "list" && (
          <button
            type="button"
            onClick={onReset}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-line text-base font-medium text-fg transition-colors active:bg-surface-2"
          >
            {DASHBOARD_WIDGET_WORDS.reset}
          </button>
        )}
      </div>
    </div>
  );
}
