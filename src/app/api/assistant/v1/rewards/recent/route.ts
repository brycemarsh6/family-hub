import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { readRecentRewards } from "@/lib/assistant/rewardReads";

export const GET = assistantRoute({
  action: "rewards.recent",
  handler: async ({ now }) => ({ data: await readRecentRewards(now) }),
});
