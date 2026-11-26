import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { requireHouseholdPerson } from "@/lib/assistant/habitReads";
import { readPersonStars } from "@/lib/assistant/rewardReads";
import { adjustmentBody } from "@/lib/assistant/schemasRewards";
import { adjustmentChange, toAdjustmentAnswer } from "@/lib/assistant/serializeRewards";
import { toAdjustmentInput } from "@/lib/rewards/starAdjustments";
import { addStarAdjustment } from "@/lib/starAdjustmentWrites";
import { invalid, missing } from "@/lib/writeError";
import type { z } from "zod";

export const POST = assistantRoute<Record<string, never>, z.output<typeof adjustmentBody>>({
  action: "rewards.adjust",
  body: adjustmentBody,
  handler: async ({ body, changes }) => {
    await requireHouseholdPerson(body.personId);
    // The app's own rules and words: the stepper's list of amounts, the note's length.
    const checked = toAdjustmentInput(body);
    if (!checked.ok) throw toWriteFailure(invalid(checked.error));
    // Given by the bot, not a user: createdById stays null (history reads it as Winnie's).
    const result = await addStarAdjustment({ userId: body.personId, ...checked.value, createdById: null });
    if (!result.ok) throw toWriteFailure(missing(result.error));
    changes.push(adjustmentChange(result.row));
    const person = await readPersonStars(body.personId);
    if (!person) throw notFound();
    return { status: 201, data: { adjustment: toAdjustmentAnswer(result.row), person } };
  },
});
