import type { DashboardLayout } from "./dashboardLayout";
import { keepOwnPicks } from "./dashboardPicks";

// Pure rules for the Customize sheet: which list a pickable item sits in, what
// a toggle does to the picks, and the new widget order after a drag (decisions
// 137, 140). No db, no React.

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

/**
 * The layout with its widgets in the order `ids` gives. Ids that are not in
 * the layout are ignored and widgets the list forgot keep their relative order
 * at the end, so a stale drop can never lose a widget.
 */
export function reorderWidgets(layout: DashboardLayout, ids: string[]): DashboardLayout {
  const rank = (id: string) => {
    const index = ids.indexOf(id);
    return index === -1 ? ids.length : index;
  };
  const widgets = layout.widgets.map((w) => ({ ...w })).sort((a, b) => rank(a.id) - rank(b.id));
  return { version: 1, widgets };
}
