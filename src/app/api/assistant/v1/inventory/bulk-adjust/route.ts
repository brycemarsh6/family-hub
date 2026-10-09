import { assistantRoute } from "@/lib/assistant/route";
import { ApiError } from "@/lib/assistant/errors";
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

    // All adjustments commit or roll back together.
    const results = await db.$transaction(async (tx) => {
      const out: { id: string; before: number; after: number }[] = [];
      for (const adj of body.adjustments) {
        const r = await adjustPantryQuantity(adj.id, adj.delta, tx);
        if (!r) throw new ApiError(404, "not_found", "An item vanished mid-request.", { missing: [adj.id] });
        out.push({ id: adj.id, before: r.before, after: r.after });
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
