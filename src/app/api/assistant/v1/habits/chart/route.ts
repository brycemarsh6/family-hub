import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { readChart } from "@/lib/assistant/habitReads";
import { habitChartQuery } from "@/lib/assistant/schemasHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof habitChartQuery>>({
  action: "habits.chart",
  query: habitChartQuery,
  handler: async ({ query, now }) => {
    const chart = await readChart(query.personId, requireHouseholdToday(now));
    if (!chart) throw notFound();
    return { data: chart };
  },
});
