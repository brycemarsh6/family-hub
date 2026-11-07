import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { getGoal, winnieMayChangeGoal } from "@/lib/assistant/goalReads";
import { checkInBody } from "@/lib/assistant/schemasGoals";
import { checkInChange, goalUpdateChange } from "@/lib/assistant/serializeGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { addCheckIn } from "@/lib/goalWrites";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof checkInBody>>({
  action: "goals.checkIn",
  body: checkInBody,
  handler: async ({ params, body, changes, now }) => {
    const today = requireHouseholdToday(now);
    // Made by the bot, not a user: createdById stays null.
    const result = await addCheckIn(winnieMayChangeGoal, params.id, body.value, null);
    if ("error" in result) throw toWriteFailure(result);
    changes.push(...goalUpdateChange(result.before, result.after), checkInChange("create", result.checkIn));
    const goal = await getGoal(params.id, today);
    if (!goal) throw notFound();
    const { checkIn } = result;
    return { status: 201, data: { checkIn: { id: checkIn.id, value: checkIn.value, at: checkIn.at.toISOString() }, goal } };
  },
});
