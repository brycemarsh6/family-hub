import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { viewGoal, winnieMayChangeGoal } from "@/lib/assistant/goalReads";
import { planItemCreateBody } from "@/lib/assistant/schemasGoals";
import { planItemCreateChanges, toPlanItem } from "@/lib/assistant/serializeGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { createPlanItem } from "@/lib/planItemWrites";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof planItemCreateBody>>({
  action: "goals.addPlanItem",
  body: planItemCreateBody,
  handler: async ({ params, body, changes, now }) => {
    const today = requireHouseholdToday(now);
    // Made by the bot, not a user: a habit's createdById stays null.
    const result = await createPlanItem(winnieMayChangeGoal, params.id, body, null);
    if ("error" in result) throw toWriteFailure(result);
    changes.push(...planItemCreateChanges(result.item, result.habits, result.participants));
    const item = (await viewGoal(params.id, today))?.items.find((candidate) => candidate.id === result.item.id);
    if (!item) throw notFound();
    return { status: 201, data: { item: toPlanItem(item) } };
  },
});
