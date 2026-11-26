import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { requireHouseholdPerson } from "@/lib/assistant/habitReads";
import { readRewardAnswer, readRewards } from "@/lib/assistant/rewardReads";
import { newRewardInput, rewardCreateBody, rewardsQuery } from "@/lib/assistant/schemasRewards";
import { rewardChange } from "@/lib/assistant/serializeRewards";
import { createReward, createWish } from "@/lib/rewardWrites";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof rewardsQuery>>({
  action: "rewards.list",
  query: rewardsQuery,
  handler: async ({ query }) => {
    const answer = await readRewards(query.personId);
    if (!answer) throw notFound();
    return { data: answer };
  },
});

export const POST = assistantRoute<Record<string, never>, z.output<typeof rewardCreateBody>>({
  action: "rewards.create",
  body: rewardCreateBody,
  handler: async ({ body, changes }) => {
    await requireHouseholdPerson(body.personId);
    // A cost makes it a reward, none makes it a wish; the app's own checks give the words.
    const input = newRewardInput(body);
    if ("error" in input) throw toWriteFailure(input);
    // Made by the bot, not a user: createdById stays null.
    const row = input.kind === "reward" ? await createReward(input.value, null) : await createWish(input.value, null);
    changes.push(rewardChange("create", null, row));
    const answer = await readRewardAnswer(row.ownerId, row.id);
    if (!answer) throw notFound();
    return { status: 201, data: answer };
  },
});
