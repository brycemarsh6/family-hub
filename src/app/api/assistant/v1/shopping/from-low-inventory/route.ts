import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { fromLowInventoryBody } from "@/lib/assistant/schemasShopping";
import { toShoppingItems } from "@/lib/assistant/shoppingReads";
import { addLowItemsToList } from "@/lib/groceryWrites";
import type { z } from "zod";

export const POST = assistantRoute<Record<string, never>, z.output<typeof fromLowInventoryBody>>({
  action: "shopping.fromLowInventory",
  body: fromLowInventoryBody,
  handler: async ({ body, changes }) => {
    const rows = await addLowItemsToList(body.store ?? null, null);
    for (const row of rows) {
      changes.push({
        model: "GroceryItem",
        recordId: row.id,
        action: "create",
        summary: { via: "fromLowInventory", fromInventoryId: row.pantryItemId },
      });
    }
    return { status: 201, data: { items: await toShoppingItems(rows, rows.map((r) => r.id)) } };
  },
});
