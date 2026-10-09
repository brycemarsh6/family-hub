import { assistantRoute } from "@/lib/assistant/route";
import { ApiError, notFound } from "@/lib/assistant/errors";
import { bulkAdjustBody } from "@/lib/assistant/schemas";
import { adjustPantryQuantity } from "@/lib/pantryWrites";
import { db } from "@/lib/db";

export const POST = assistantRoute({
  action: "inventory.bulkAdjust",
  body: bulkAdjustBody,
  handler: async ({ body, changes }) => {
    // Confirm every id first so a typo'd one refuses the whole batch instead
    // of leaving half of it applied.
    const ids = body.adjustments.map((a) => a.id);
    const found = await db.pantryItem.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((f) => f.id));
    const missing = ids.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new ApiError(404, "not_found", "Some items don't exist; nothing was changed.", {
        missing,
      });
    }

    // All adjustments commit or roll back together. Applied in id order, not
    // request order: two batches naming the same items in opposite orders
    // would otherwise each hold one row while waiting on the other (a
    // deadlock, seen as a 500). A consistent order makes them queue instead.
    // Results are stored back at each adjustment's original index.
    const order = body.adjustments.map((adj, index) => ({ adj, index }));
    order.sort((a, b) => (a.adj.id < b.adj.id ? -1 : a.adj.id > b.adj.id ? 1 : 0));
    const results = await db.$transaction(async (tx) => {
      const out: { id: string; before: number; after: number }[] = new Array(order.length);
      for (const { adj, index } of order) {
        // No post-write re-read: the response needs only before/after.
        const r = await adjustPantryQuantity(adj.id, adj.delta, tx, { returnRow: false });
        if (!r) throw notFound();
        // Throwing inside $transaction rolls back every adjustment so far.
        if (r === "conflict") {
          throw new ApiError(409, "conflict", "An item changed while we were updating it; nothing was changed. Try again.", { id: adj.id });
        }
        out[index] = { id: adj.id, before: r.before, after: r.after };
      }
      return out;
    });

    body.adjustments.forEach((adj, i) => {
      changes.push({
        model: "PantryItem",
        recordId: adj.id,
        action: "update",
        summary: {
          delta: adj.delta,
          before: results[i].before,
          after: results[i].after,
          reason: adj.reason ?? null,
        },
      });
    });

    return { data: { results } };
  },
});
