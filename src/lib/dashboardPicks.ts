import type { DashboardLayout } from "./dashboardLayout";
import type { DashboardWidgetId } from "./dashboardWidgets";

// Pure rules for the dashboard's picked items and the wall tablet's layout
// (decisions 132, 136, 137, 138). The parser keeps `items` as a claim about
// ids (shape only, no db); keepOwnPicks is where the page turns that claim
// into something it may use, and splitPicks and togglePick are what the
// Customize picker does with it. No db, no React.

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

/**
 * Split the pickable items into "Showing" (picked, in picked order) and "Not
 * showing" (the rest, in the order given: Manage order for habits, target date
 * for goals). A pick that is no longer pickable is left out of both lists.
 */
export function splitPicks<T extends { id: string }>(items: T[], picks: string[]): { showing: T[]; notShowing: T[] } {
  const byId = new Map(items.map((item) => [item.id, item]));
  const showing = keepOwnPicks(picks, byId.keys()).map((id) => byId.get(id)!);
  const picked = new Set(showing.map((item) => item.id));
  return { showing, notShowing: items.filter((item) => !picked.has(item.id)) };
}

/**
 * The picks after flipping one item: a picked item is removed, an unpicked one
 * goes to the end. Picks that are no longer pickable are dropped on the way.
 */
export function togglePick(items: { id: string }[], picks: string[], id: string): string[] {
  const kept = keepOwnPicks(picks, items.map((item) => item.id));
  return kept.includes(id) ? kept.filter((pick) => pick !== id) : [...kept, id];
}
