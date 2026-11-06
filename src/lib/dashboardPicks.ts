import type { DashboardLayout } from "./dashboardLayout";
import type { DashboardWidgetId } from "./dashboardWidgets";

// Pure page rules for the dashboard's picked items and the wall tablet's
// layout (decisions 132, 136, 138). The parser keeps `items` as a claim about
// ids (shape only, no db); these two functions are where the page turns that
// claim into something it may use. No db, no React.

/** The picked ids a widget has in this layout, in picked order; empty when none. */
export function picksOf(layout: DashboardLayout, id: DashboardWidgetId): string[] {
  return layout.widgets.find((w) => w.id === id)?.items ?? [];
}

/**
 * Keep only the picks that are in `allowed` (the viewer's own habits or
 * goals), in picked order. A pick that is gone, archived, completed, someone
 * else's or a private habit they cannot see is dropped without a word.
 */
export function keepOwnPicks(picks: string[], allowed: Iterable<string>): string[] {
  const ok = new Set(allowed);
  return picks.filter((id) => ok.has(id));
}

/** The wall tablet has no Habits or Chores today tile (decision 138); everyone else's layout is unchanged. */
export function layoutForViewer(layout: DashboardLayout, isDevice: boolean): DashboardLayout {
  if (!isDevice) return layout;
  return { version: 1, widgets: layout.widgets.filter((w) => w.id !== "habits" && w.id !== "chores") };
}
