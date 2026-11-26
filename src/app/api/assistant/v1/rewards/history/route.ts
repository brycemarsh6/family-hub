import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { readStarHistory } from "@/lib/assistant/rewardReads";
import { rewardsHistoryQuery } from "@/lib/assistant/schemasRewards";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof rewardsHistoryQuery>>({
  action: "rewards.history",
  query: rewardsHistoryQuery,
  handler: async ({ query, now }) => {
    const answer = await readStarHistory(query.personId, now);
    if (!answer) throw notFound();
    return { data: answer };
  },
});
