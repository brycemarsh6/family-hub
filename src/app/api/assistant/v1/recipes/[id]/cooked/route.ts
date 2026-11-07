import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { recipeActionBody } from "@/lib/assistant/schemasRecipes";
import { markRecipeCookedRow } from "@/lib/recipeWrites";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof recipeActionBody>>({
  action: "recipes.cooked",
  body: recipeActionBody,
  handler: async ({ params, now, changes }) => {
    const result = await markRecipeCookedRow(params.id, now);
    if (!result) throw notFound();
    changes.push({
      model: "Recipe",
      recordId: params.id,
      action: "update",
      summary: { lastCookedAt: now.toISOString() },
      before: result.before,
      after: result.after,
    });
    return {
      data: { recipe: { id: params.id, lastCookedAt: result.after.lastCookedAt?.toISOString() ?? null } },
    };
  },
});
