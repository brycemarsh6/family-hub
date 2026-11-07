import { HOUSEHOLD_TIME_ZONE } from "./constants";
import { nextStep } from "./goals";
import type { PlanItemView } from "./goalsProgress";
import { zoneMidnightInstant, type CalendarDate } from "./householdDate";

// The rows This week shows for one goal, in order. Pure. It sits beside
// `weekSummary` (goalsProgress.ts) but cannot live in it: `nextStep` is in
// goals.ts, and goals.ts imports goalsProgress.ts.

/**
 * A goal's rows for the week: its habits, then the steps ticked this week, then
 * the next step, then its reminders. A step checked off this week stays put,
 * struck through, so a second tap can undo it; the next undone step sits below
 * it rather than sliding into its place. `doneAt` is a real instant and the
 * week starts at household midnight, so the cut-off is that midnight, not
 * UTC's. Done steps run oldest first, which leaves the one just ticked directly
 * above the next step.
 */
export function weekRows(goal: { items: PlanItemView[] }, weekStart: CalendarDate): PlanItemView[] {
  const weekStartMs = zoneMidnightInstant(weekStart, HOUSEHOLD_TIME_ZONE).getTime();
  const doneAtMs = (item: PlanItemView) => item.doneAt?.getTime() ?? 0;
  const step = nextStep(goal.items);
  const stepView = step ? goal.items.find((item) => item.id === step.id) : undefined;
  return [
    ...goal.items.filter((item) => item.kind === "habit"),
    ...goal.items
      .filter((item) => item.kind === "step" && item.doneAt !== null && doneAtMs(item) >= weekStartMs)
      .sort((a, b) => doneAtMs(a) - doneAtMs(b)),
    ...(stepView ? [stepView] : []),
    ...goal.items.filter((item) => item.kind === "reminder"),
  ];
}
