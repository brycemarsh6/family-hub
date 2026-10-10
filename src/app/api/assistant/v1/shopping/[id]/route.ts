import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError, notFound } from "@/lib/assistant/errors";
import { shoppingPatchBody } from "@/lib/assistant/schemasShopping";
import { getShoppingItem } from "@/lib/assistant/shoppingReads";
import { didAssistantCreate } from "@/lib/assistant/audit";
import { deleteGroceryItem, editGroceryItem, setGroceryChecked } from "@/lib/groceryWrites";
import type { z } from "zod";

export const PATCH = assistantRoute<{ id: string }, z.output<typeof shoppingPatchBody>>({
  action: "shopping.update",
  body: shoppingPatchBody,
  handler: async ({ params, body, changes }) => {
    const { checked, ...edits } = body;
    if (Object.keys(edits).length > 0) {
      if (!(await editGroceryItem(params.id, edits))) throw notFound();
    }
    if (checked !== undefined) {
      if ((await setGroceryChecked([params.id], checked)) === 0) throw notFound();
    }
    changes.push({ model: "GroceryItem", recordId: params.id, action: "update", summary: body });
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
    await deleteGroceryItem(params.id); // P2025 on a missing row -> 404 via the wrapper
    changes.push({ model: "GroceryItem", recordId: params.id, action: "delete", summary: null });
    return { data: { deleted: params.id } };
  },
});
