import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError, notFound } from "@/lib/assistant/errors";
import { inventoryPatchBody } from "@/lib/assistant/schemas";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { toInventoryItem } from "@/lib/assistant/serialize";
import { editPantryItem } from "@/lib/pantryWrites";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { parseDateParam, zoneMidnightInstant } from "@/lib/householdDate";
import { isOnShoppingList } from "@/lib/assistant/inventoryReads";
import { db } from "@/lib/db";
import type { z } from "zod";

export const GET = assistantRoute<{ id: string }>({
  action: "inventory.get",
  handler: async ({ params, now }) => {
    const [row, onList] = await Promise.all([
      db.pantryItem.findUnique({ where: { id: params.id } }),
      isOnShoppingList(params.id),
    ]);
    if (!row) throw notFound();
    const today = requireHouseholdToday(now);
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
      // The schema already rejected impossible dates, so the parse can't be null.
      expiresAt = zoneMidnightInstant(parseDateParam(expiresOn)!, HOUSEHOLD_TIME_ZONE);
    }

    const result = await editPantryItem(params.id, { ...rest, expiresAt });
    if (!result) throw notFound();
    if (result === "conflict") {
      throw new ApiError(409, "conflict", "That item changed while we were updating it; try again.");
    }
    const row = result.after;
    changes.push({
      model: "PantryItem",
      recordId: row.id,
      action: "update",
      summary: body,
      before: result.before,
      after: row,
    });

    const onList = await isOnShoppingList(row.id);
    const today = requireHouseholdToday(now);
    return {
      data: {
        item: toInventoryItem(row, { onList, today, timeZone: HOUSEHOLD_TIME_ZONE }),
      },
    };
  },
});
