import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { readRewards } from "@/lib/assistant/rewardReads";
import { rewardsQuery } from "@/lib/assistant/schemasRewards";
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
