import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { mealPlanWeekQuery } from "@/lib/assistant/schemasMealPlan";
import { toWeek, weekForDate } from "@/lib/assistant/serializeMealPlan";
import { findWeekPlan, readWeekEntries } from "@/lib/assistant/mealPlanReads";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { parseDateParam } from "@/lib/householdDate";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof mealPlanWeekQuery>>({
  action: "mealPlan.week",
  query: mealPlanWeekQuery,
  handler: async ({ query, now }) => {
    // weekOf is any day; its Denver Sunday is the week. Omitted = this week.
    const day = query.weekOf ? parseDateParam(query.weekOf)! : requireHouseholdToday(now);
    const { sunday, instant } = weekForDate(day);
    const plan = await findWeekPlan(instant);
    const { entries, recipeTitles } = plan
      ? await readWeekEntries(plan.id)
      : { entries: [], recipeTitles: new Map<string, string>() };
    return { data: toWeek(sunday, plan?.id ?? null, entries, recipeTitles) };
  },
});
