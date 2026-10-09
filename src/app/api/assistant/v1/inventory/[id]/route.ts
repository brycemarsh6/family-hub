import { assistantRoute } from "@/lib/assistant/route";
import { ApiError } from "@/lib/assistant/errors";
import { inventoryPatchBody } from "@/lib/assistant/schemas";
import { householdToday } from "@/lib/assistant/today";
import { toInventoryItem } from "@/lib/assistant/serialize";
import { editPantryItem } from "@/lib/pantryWrites";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { parseDateParam, zoneMidnightInstant } from "@/lib/householdDate";
import { isOnShoppingList } from "@/lib/assistant/inventoryReads";
import { db } from "@/lib/db";
import type { z } from "zod";

const notFound = () => new ApiError(404, "not_found", "That record doesn't exist.");

export const GET = assistantRoute<{ id: string }>({
  action: "inventory.get",
  handler: async ({ params, now }) => {
    const [row, onList] = await Promise.all([
      db.pantryItem.findUnique({ where: { id: params.id } }),
      isOnShoppingList(params.id),
    ]);
    if (!row) throw notFound();
    const today = householdToday(now)!;
    return {
      data: {
        item: toInventoryItem(row, { onList, today, timeZone: HOUSEHOLD_TIME_ZONE }),
      },
    };
  },
});

export const PATCH = assistantRoute<{ id: string }, z.output<typeof inventoryPatchBody>>({
  action: "inventory.update",
  body: inventoryPatchBody,
  handler: async ({ params, body, now, changes }) => {
    const { expiresOn, ...rest } = body;
    let expiresAt: Date | null | undefined;
    if (expiresOn === null) {
      expiresAt = null;
    } else if (expiresOn !== undefined) {
      const parsed = parseDateParam(expiresOn);
      if (!parsed) throw new ApiError(400, "validation", "`expiresOn` must be a real YYYY-MM-DD.");
      expiresAt = zoneMidnightInstant(parsed, HOUSEHOLD_TIME_ZONE);
    }

    const row = await editPantryItem(params.id, { ...rest, expiresAt });
    if (!row) throw notFound();
    changes.push({ model: "PantryItem", recordId: row.id, action: "update", summary: body });

    const onList = await isOnShoppingList(row.id);
    const today = householdToday(now)!;
    return {
      data: {
        item: toInventoryItem(row, { onList, today, timeZone: HOUSEHOLD_TIME_ZONE }),
      },
    };
  },
});
