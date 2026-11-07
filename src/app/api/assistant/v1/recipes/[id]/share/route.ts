import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { recipeActionBody } from "@/lib/assistant/schemasRecipes";
import { toShareUrl } from "@/lib/assistant/serializeRecipes";
import { shareRecipeRow, stopSharingRecipeRow } from "@/lib/recipeWrites";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof recipeActionBody>>({
  action: "recipes.share",
  body: recipeActionBody,
  handler: async ({ request, params, changes }) => {
    const result = await shareRecipeRow(params.id);
    if (!result) throw notFound();
    // Already shared: the token is kept and nothing was written.
    if (result.changed) {
      changes.push({
        model: "Recipe",
        recordId: params.id,
        action: "update",
        summary: { sharing: true },
        before: result.before,
        after: result.after,
      });
    }
    return { data: { shareUrl: toShareUrl(request.nextUrl.origin, result.after.shareToken) } };
  },
});

export const DELETE = assistantRoute<{ id: string }>({
  action: "recipes.stopSharing",
  handler: async ({ params, changes }) => {
    const result = await stopSharingRecipeRow(params.id);
    if (!result) throw notFound();
    // Not shared to begin with: nothing changed, so nothing is recorded.
    if (result.before.shareToken !== null) {
      changes.push({
        model: "Recipe",
        recordId: params.id,
        action: "update",
        summary: { sharing: false },
        before: result.before,
        after: result.after,
      });
    }
    return { data: { shareUrl: null } };
  },
});
