// The pure half of "which meal plan is a week's": the tolerance and the
// nearest-plan picker. No database, so `assistant/summary.ts` (and its tests)
// can use it; the queries that fetch candidates live in `mealPlanWrites.ts`
// (`findWeekPlan`) and `assistant/summaryReads.ts`, both through `planWindow`.
//
// Plans are stored as the creating phone's local midnight, which differs by
// zone, so a week's plan is found by distance, never by equality. A different
// week is 7 days away and can never fall in range.

/** How far a plan's stored `weekStart` may sit from the household zone's midnight. */
export const PLAN_TOLERANCE_MS = 14 * 60 * 60 * 1000;

/** The `weekStart` range that can hold the plan for the week at `instantMs`. */
export function planWindow(instantMs: number): { gte: Date; lte: Date } {
  return {
    gte: new Date(instantMs - PLAN_TOLERANCE_MS),
    lte: new Date(instantMs + PLAN_TOLERANCE_MS),
  };
}

/** Of `plans`, the one within tolerance of `instantMs`, nearest wins; else null. */
export function pickNearestPlan<P extends { weekStart: Date }>(plans: P[], instantMs: number): P | null {
  let best: P | null = null;
  let bestGap = Infinity;
  for (const plan of plans) {
    const gap = Math.abs(plan.weekStart.getTime() - instantMs);
    if (gap <= PLAN_TOLERANCE_MS && gap < bestGap) {
      best = plan;
      bestGap = gap;
    }
  }
  return best;
}
