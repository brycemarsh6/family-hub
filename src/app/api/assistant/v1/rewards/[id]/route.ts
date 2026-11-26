import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { didAssistantCreate } from "@/lib/assistant/audit";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { readRewardAnswer } from "@/lib/assistant/rewardReads";
import { REWARD_NOT_HERS, REWARD_REDEEMED, patchedRewardInput, rewardPatchBody } from "@/lib/assistant/schemasRewards";
import { rewardChange } from "@/lib/assistant/serializeRewards";
import { sameCopy, toCopy } from "@/lib/assistant/undoPlan";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { REWARD_GONE_REFUSAL } from "@/lib/rewardVocabulary";
import { deleteReward, updateReward } from "@/lib/rewardWrites";
import { missing } from "@/lib/writeError";
import type { z } from "zod";

export const PATCH = assistantRoute<{ id: string }, z.output<typeof rewardPatchBody>>({
  action: "rewards.update",
  body: rewardPatchBody,
  handler: async ({ params, body, changes }) => {
    // An owner who is not a household person (deactivated, or a device login)
    // is refused inside the write, so nothing is saved and nothing is logged.
    const household = new Set((await loadHouseholdPeople()).map((p) => p.id));
    const result = await updateReward(params.id, (current) =>
      household.has(current.ownerId) ? patchedRewardInput(current, body) : missing(REWARD_GONE_REFUSAL),
    );
    if (!result) throw notFound();
    if ("error" in result) throw toWriteFailure(result);
    // A change that changes nothing records nothing.
    if (!sameCopy("Reward", toCopy("Reward", result.before), toCopy("Reward", result.after))) {
      changes.push(rewardChange("update", result.before, result.after));
    }
    const answer = await readRewardAnswer(result.after.ownerId, result.after.id);
    if (!answer) throw notFound();
    return { data: answer };
  },
});

export const DELETE = assistantRoute<{ id: string }>({
  action: "rewards.delete",
  handler: async ({ params, changes }) => {
    // The guard runs inside the delete's transaction, on the locked row: only
    // her own, and never one that has been redeemed (the family's history).
    const result = await deleteReward(params.id, {
      guard: async (row, redeemedCount) => {
        if (!(await didAssistantCreate("Reward", row.id))) throw new ApiError(403, "forbidden", REWARD_NOT_HERS);
        if (redeemedCount > 0) throw new ApiError(409, "conflict", REWARD_REDEEMED);
        return null;
      },
    });
    if ("error" in result) throw toWriteFailure(result);
    if (!result.removed) throw notFound();
    changes.push(rewardChange("delete", result.removed, null));
    return { data: { removed: true } };
  },
});
