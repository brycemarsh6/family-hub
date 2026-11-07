import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { getGoal, listGoals } from "@/lib/assistant/goalReads";
import { assistantOwnerId } from "@/lib/assistant/habitActorEnv";
import { goalCreateBody, goalListQuery, newGoalRaw } from "@/lib/assistant/schemasGoals";
import { goalCreateChange } from "@/lib/assistant/serializeGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { createGoal } from "@/lib/goalWrites";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof goalListQuery>>({
  action: "goals.list",
  query: goalListQuery,
  handler: async ({ query, now }) => {
    const goals = await listGoals({ status: query.status ?? "active", personId: query.personId }, requireHouseholdToday(now));
    return { data: { goals } };
  },
});

export const POST = assistantRoute<Record<string, never>, z.output<typeof goalCreateBody>>({
  action: "goals.create",
  body: goalCreateBody,
  handler: async ({ body, changes, now }) => {
    const today = requireHouseholdToday(now);
    // Made by the bot, not a user: createdById stays null. "Mine" is the owner's; with none set the module refuses.
    const result = await createGoal({ raw: newGoalRaw(body, today), today, ownerId: assistantOwnerId(), createdById: null });
    if ("error" in result) throw toWriteFailure(result);
    changes.push(goalCreateChange(result.goal));
    const goal = await getGoal(result.goal.id, today);
    if (!goal) throw notFound();
    return { status: 201, data: { goal } };
  },
});
