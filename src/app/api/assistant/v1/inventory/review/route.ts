import { assistantRoute } from "@/lib/assistant/route";
import { toReviewQueue } from "@/lib/assistant/serialize";
import { buildReviewQueue, type DuplicateCandidate } from "@/lib/duplicates";
import { db } from "@/lib/db";

export const GET = assistantRoute({
  action: "inventory.review",
  handler: async () => {
    const [items, dismissals] = await Promise.all([
      db.pantryItem.findMany({
        select: {
          id: true,
          name: true,
          location: true,
          category: true,
          quantity: true,
          unit: true,
        },
      }),
      db.irregularityDismissal.findMany({ select: { fingerprint: true } }),
    ]);
    const queue = buildReviewQueue(
      items as DuplicateCandidate[],
      new Set(dismissals.map((d) => d.fingerprint)),
    );
    return { data: toReviewQueue(queue) };
  },
});
