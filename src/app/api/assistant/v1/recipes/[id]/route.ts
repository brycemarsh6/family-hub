import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError, notFound } from "@/lib/assistant/errors";
import { recipePatchBody } from "@/lib/assistant/schemasRecipes";
import { allTagsExist, getRecipe } from "@/lib/assistant/recipeReads";
import { toWriteFailure } from "@/lib/assistant/serializeRecipes";
import { setRecipeTagRows, updateRecipeRow } from "@/lib/recipeWrites";
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

    // The fields and the tag set are two writes in two transactions. A
    // failure between them leaves the first one written, and recorded in the
    // audit log (so it is undoable). The tag ids are checked up front so the
    // common failure, an unknown tag, writes nothing at all.
    if (tagIds && !(await allTagsExist(tagIds))) {
      throw new ApiError(404, "not_found", "That tag no longer exists.");
    }

    if (Object.keys(fields).length > 0) {
      const result = await updateRecipeRow(params.id, fields);
      if (!result) throw notFound();
      if ("error" in result) throw toWriteFailure(result.error);
      changes.push({
        model: "Recipe",
        recordId: params.id,
        action: "update",
        summary: { changed: Object.keys(fields) },
        before: result.before,
        after: result.after,
      });
    }

    if (tagIds) {
      const result = await setRecipeTagRows(params.id, tagIds);
      if ("error" in result) throw toWriteFailure(result.error);
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
    }

    const recipe = await getRecipe(params.id, request.nextUrl.origin);
    if (!recipe) throw notFound();
    return { data: { recipe } };
  },
});
