import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { recipePatchBody } from "@/lib/assistant/schemasRecipes";
import { getRecipe } from "@/lib/assistant/recipeReads";
import { updateRecipeAndTagsRow } from "@/lib/recipeWrites";
import type { z } from "zod";

export const GET = assistantRoute<{ id: string }>({
  action: "recipes.get",
  handler: async ({ request, params }) => {
    const recipe = await getRecipe(params.id, request.nextUrl.origin);
    if (!recipe) throw notFound();
    return { data: { recipe } };
  },
});

export const PATCH = assistantRoute<{ id: string }, z.output<typeof recipePatchBody>>({
  action: "recipes.update",
  body: recipePatchBody,
  handler: async ({ request, params, body, changes }) => {
    const { tagIds, ingredients, steps, ...rest } = body;
    const fields = {
      ...rest,
      ...(ingredients ? { ingredients: ingredients.join("\n") } : {}),
      ...(steps ? { steps: steps.join("\n") } : {}),
    };

    // The fields and the tag set go in ONE transaction: either the whole edit
    // is saved and recorded, or nothing is written (an unknown tag, a recipe
    // deleted mid-request), so a failed request is never half-undoable.
    const result = await updateRecipeAndTagsRow(params.id, fields, tagIds);
    if (!result) throw notFound();
    if ("error" in result) throw toWriteFailure(result);

    if (Object.keys(fields).length > 0) {
      changes.push({
        model: "Recipe",
        recordId: params.id,
        action: "update",
        summary: { changed: Object.keys(fields) },
        before: result.before,
        after: result.after,
      });
    }
    for (const row of result.deleted) {
      changes.push({
        model: "RecipeTag",
        recordId: row.id,
        action: "delete",
        summary: { recipeId: params.id, tagId: row.tagId },
        before: row,
        after: null,
      });
    }
    for (const row of result.created) {
      changes.push({
        model: "RecipeTag",
        recordId: row.id,
        action: "create",
        summary: { recipeId: params.id, tagId: row.tagId },
        before: null,
        after: row,
      });
    }

    const recipe = await getRecipe(params.id, request.nextUrl.origin);
    if (!recipe) throw notFound();
    return { data: { recipe } };
  },
});
