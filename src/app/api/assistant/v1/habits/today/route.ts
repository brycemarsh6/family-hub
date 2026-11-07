import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { readToday } from "@/lib/assistant/habitReads";
import { habitPersonQuery } from "@/lib/assistant/schemasHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof habitPersonQuery>>({
  action: "habits.today",
  query: habitPersonQuery,
  handler: async ({ query, now }) => {
    const day = await readToday(query.personId, requireHouseholdToday(now));
    if (!day) throw notFound();
    return { data: day };
  },
});
