import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError, notFound } from "@/lib/assistant/errors";
import { shoppingPatchBody } from "@/lib/assistant/schemasShopping";
import { getShoppingItem } from "@/lib/assistant/shoppingReads";
import { didAssistantCreate } from "@/lib/assistant/audit";
import { deleteGroceryItem, patchGroceryItemWithCopies } from "@/lib/groceryWrites";
import type { z } from "zod";

export const PATCH = assistantRoute<{ id: string }, z.output<typeof shoppingPatchBody>>({
  action: "shopping.update",
  body: shoppingPatchBody,
  handler: async ({ params, body, changes }) => {
    const { checked, ...edits } = body;
    // One locked transaction for the edit and the tick, so the copies are
    // exactly what this request replaced and left.
    const copies = await patchGroceryItemWithCopies(params.id, edits, checked);
    if (!copies) throw notFound();
    changes.push({
      model: "GroceryItem",
      recordId: params.id,
      action: "update",
      summary: body,
      before: copies.before,
      after: copies.after,
    });
    const item = await getShoppingItem(params.id);
    if (!item) throw notFound();
    return { data: { item } };
  },
});

export const DELETE = assistantRoute<{ id: string }>({
  action: "shopping.delete",
  handler: async ({ params, changes }) => {
    // The bot deletes only what it created (the audit log's create records are
    // kept forever). Anything else is 403 if it exists and 404 if it doesn't.
    const mine = await didAssistantCreate("GroceryItem", params.id);
    if (!mine) {
      const exists = await getShoppingItem(params.id);
      if (!exists) throw notFound();
      throw new ApiError(
        403,
        "forbidden",
        "Winnie can only delete items she added. Check it off instead, or ask a family member.",
      );
    }
    // The delete returns the row it removed: that is the `before` copy.
    const removed = await deleteGroceryItem(params.id); // P2025 on a missing row -> 404 via the wrapper
    changes.push({
      model: "GroceryItem",
      recordId: params.id,
      action: "delete",
      summary: null,
      before: removed,
      after: null,
    });
    return { data: { deleted: params.id } };
  },
});
