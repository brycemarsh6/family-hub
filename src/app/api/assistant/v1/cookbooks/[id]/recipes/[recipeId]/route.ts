import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { toWriteFailure } from "@/lib/assistant/errors";
import { cookbookActionBody } from "@/lib/assistant/schemasCookbooks";
import { fileRecipeRow, unfileRecipeRow } from "@/lib/cookbookWrites";
import type { z } from "zod";

export const PUT = assistantRoute<{ id: string; recipeId: string }, z.output<typeof cookbookActionBody>>({
  action: "cookbooks.fileRecipe",
  body: cookbookActionBody,
  handler: async ({ params, changes }) => {
    const result = await fileRecipeRow(params.id, params.recipeId);
    if ("error" in result) throw toWriteFailure(result);
    // Already filed: nothing was written, so nothing is recorded.
    if (result.created) {
      changes.push({
        model: "CookbookRecipe",
        recordId: result.created.id,
        action: "create",
        summary: { recipeId: params.recipeId, cookbookId: params.id },
        before: null,
        after: result.created,
      });
    }
    return { data: { filed: true } };
  },
});

export const DELETE = assistantRoute<{ id: string; recipeId: string }>({
  action: "cookbooks.unfileRecipe",
  handler: async ({ params, changes }) => {
    const { deleted } = await unfileRecipeRow(params.id, params.recipeId);
    // Not filed to begin with: nothing changed, so nothing is recorded.
    if (deleted) {
      changes.push({
        model: "CookbookRecipe",
        recordId: deleted.id,
        action: "delete",
        summary: { recipeId: params.recipeId, cookbookId: params.id },
        before: deleted,
        after: null,
      });
    }
    return { data: { removed: deleted !== null } };
  },
});
