import { CALENDAR_WIDGET_WORDS, WIDGET_SIZE_LABELS, type DashboardWidgetKind, type WidgetSize } from "@/lib/dashboardWidgets";

// Per-widget options (W2, decision 236): the small settings a widget keeps
// in the saved layout beside its size. Only the Calendar widget has any so
// far. Pure, no React: dashboardLayout.ts imports this file, never the other
// way, so the widget parameters below are typed structurally.

export type CalendarWidgetOptions = {
  /** Show only tasks, hiding events and planned habits. */
  tasksOnly: boolean;
  /** Show the whole day, ended events included, instead of hiding what is over. */
  wholeDay: boolean;
  /** How many day columns a wide Calendar widget shows. */
  days: 3 | 7;
};

export const CALENDAR_WIDGET_DEFAULTS: CalendarWidgetOptions = { tasksOnly: false, wholeDay: false, days: 3 };

/** What is stored: any subset, with the defaults filled in on read. */
export type DashboardWidgetOptions = Partial<CalendarWidgetOptions>;

/**
 * Any stored value to safe options for `kind`, or undefined when nothing
 * valid is left. Calendar keeps `tasksOnly` and `wholeDay` only when they are
 * booleans and `days` only when it is 3 or 7; every other key is dropped. A
 * kind with no options always gives undefined.
 */
export function cleanWidgetOptions(kind: DashboardWidgetKind, raw: unknown): DashboardWidgetOptions | undefined {
  if (kind !== "calendar" || typeof raw !== "object" || raw === null) return undefined;
  const { tasksOnly, wholeDay, days } = raw as Record<string, unknown>;
  const out: DashboardWidgetOptions = {};
  if (typeof tasksOnly === "boolean") out.tasksOnly = tasksOnly;
  if (typeof wholeDay === "boolean") out.wholeDay = wholeDay;
  if (days === 3 || days === 7) out.days = days;
  return Object.keys(out).length === 0 ? undefined : out;
}

/** A Calendar widget's options with the defaults filled in. */
export function calendarOptionsOf(widget: { options?: DashboardWidgetOptions }): CalendarWidgetOptions {
  return { ...CALENDAR_WIDGET_DEFAULTS, ...widget.options };
}

/** The second line of a widget's Customize row: its size, plus "Tasks only" on a Calendar that has it on. */
export function widgetRowDetail(widget: { kind: DashboardWidgetKind; size: WidgetSize; options?: DashboardWidgetOptions }): string {
  const size = WIDGET_SIZE_LABELS[widget.size];
  return widget.kind === "calendar" && calendarOptionsOf(widget).tasksOnly ? `${size}, ${CALENDAR_WIDGET_WORDS.tasksOnly}` : size;
}
