import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { readWeek } from "@/lib/assistant/goalReads";
import { goalWeekQuery } from "@/lib/assistant/schemasGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof goalWeekQuery>>({
  action: "goals.week",
  query: goalWeekQuery,
  handler: async ({ query, now }) => ({ data: await readWeek(query.personId, requireHouseholdToday(now)) }),
});
