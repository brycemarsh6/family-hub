import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { shoppingAddBody, shoppingListQuery } from "@/lib/assistant/schemasShopping";
import { listShoppingItems, toShoppingItems } from "@/lib/assistant/shoppingReads";
import { addGroceryItem } from "@/lib/groceryWrites";
import type { z } from "zod";

export const GET = assistantRoute({
  action: "shopping.list",
  query: shoppingListQuery,
  handler: async ({ query }) => ({ data: { items: await listShoppingItems(query) } }),
});

export const POST = assistantRoute<Record<string, never>, z.output<typeof shoppingAddBody>>({
  action: "shopping.add",
  body: shoppingAddBody,
  handler: async ({ body, changes }) => {
    const items = Array.isArray(body) ? body : [body];
    // Validation of every item happened up front, so a failure partway through
    // the array can only be a database error. Items written before it stay
    // written — and stay in the audit log, because `changes` is pushed as we go.
    const results: { row: Awaited<ReturnType<typeof addGroceryItem>>["row"]; merged: boolean }[] = [];
    for (const item of items) {
      const { row, merged } = await addGroceryItem(
        {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit ?? null,
          category: item.category,
          store: item.store,
          note: item.note,
        },
        { actorUserId: null, mergeIntoExisting: item.merge },
      );
      changes.push({
        model: "GroceryItem",
        recordId: row.id,
        action: merged ? "update" : "create",
        summary: merged ? { mergedQuantityAdded: item.quantity, quantity: row.quantity } : item,
      });
      results.push({ row, merged });
    }
    const serialized = await toShoppingItems(
      results.map((r) => r.row),
      results.filter((r) => !r.merged).map((r) => r.row.id),
    );
    return {
      status: 201,
      data: { items: serialized.map((item, i) => ({ item, merged: results[i].merged })) },
    };
  },
});
