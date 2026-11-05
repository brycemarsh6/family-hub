import type { PlanItemView } from "./goalsProgress";

// How a plan item looks the instant it is tapped, before the server has
// caught up. One reducer for This week and the goal page, so the two screens
// can't drift apart. Pure: no db, no React.

export type PlanItemChange =
  | { type: "log"; itemId: string }
  | { type: "undo"; itemId: string }
  | { type: "stepDone"; itemId: string; at: Date }
  | { type: "stepUndone"; itemId: string };

/** A habit is done once its count reaches its target (a reminder has no target and is never done). */
function reached(count: number, target: number): boolean {
  return target > 0 && count >= target;
}

function changeItem(item: PlanItemView, change: PlanItemChange): PlanItemView {
  switch (change.type) {
    case "log": {
      // One check a day: a second tap on a day already checked changes nothing.
      if (item.doneToday) return item;
      const count = item.count + 1;
      return { ...item, count, done: reached(count, item.target), doneToday: true };
    }
    case "undo": {
      // A habit logged past its target stays done while the count is still at or over it.
      const count = Math.max(0, item.count - 1);
      return { ...item, count, done: reached(count, item.target), doneToday: false };
    }
    case "stepDone":
      return { ...item, count: 1, done: true, doneAt: change.at };
    case "stepUndone":
      return { ...item, count: 0, done: false, doneAt: null };
  }
}

/** The items with `change` applied to the one it names; everything else is returned as is. */
export function applyPlanItemChange(items: PlanItemView[], change: PlanItemChange): PlanItemView[] {
  return items.map((item) => (item.id === change.itemId ? changeItem(item, change) : item));
}
