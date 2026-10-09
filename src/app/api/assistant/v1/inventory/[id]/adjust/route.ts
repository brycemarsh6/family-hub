import { assistantRoute } from "@/lib/assistant/route";
import { ApiError } from "@/lib/assistant/errors";
import { adjustBody } from "@/lib/assistant/schemas";
import { householdToday } from "@/lib/assistant/today";
import { toInventoryItem } from "@/lib/assistant/serialize";
import { adjustPantryQuantity } from "@/lib/pantryWrites";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { isOnShoppingList } from "@/lib/assistant/inventoryReads";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof adjustBody>>({
  action: "inventory.adjust",
  body: adjustBody,
  handler: async ({ params, body, now, changes }) => {
    const result = await adjustPantryQuantity(params.id, body.delta);
    if (!result) throw new ApiError(404, "not_found", "That record doesn't exist.");

    changes.push({
      model: "PantryItem",
      recordId: params.id,
      action: "update",
      summary: { delta: body.delta, before: result.before, after: result.after, reason: body.reason ?? null },
    });

    const onList = await isOnShoppingList(params.id);
    const today = householdToday(now)!;
    return {
      data: {
        item: toInventoryItem(result.row, {
          onList,
          today,
          timeZone: HOUSEHOLD_TIME_ZONE,
        }),
        before: result.before,
        after: result.after,
      },
    };
  },
});
