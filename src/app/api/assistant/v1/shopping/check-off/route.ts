import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError } from "@/lib/assistant/errors";
import { checkOffBody } from "@/lib/assistant/schemasShopping";
import { setGroceryChecked } from "@/lib/groceryWrites";
import { db } from "@/lib/db";
import type { z } from "zod";

export const POST = assistantRoute<Record<string, never>, z.output<typeof checkOffBody>>({
  action: "shopping.checkOff",
  body: checkOffBody,
  handler: async ({ body, changes }) => {
    const found = await db.groceryItem.findMany({
      where: { id: { in: body.ids } },
      select: { id: true },
    });
    const have = new Set(found.map((r) => r.id));
    const missing = body.ids.filter((id) => !have.has(id));
    if (missing.length > 0) {
      throw new ApiError(404, "not_found", "Some of those items don't exist.", { missing });
    }
    const updated = await setGroceryChecked(body.ids, body.checked);
    for (const id of body.ids) {
      changes.push({ model: "GroceryItem", recordId: id, action: "update", summary: { checked: body.checked } });
    }
    return { data: { updated } };
  },
});
