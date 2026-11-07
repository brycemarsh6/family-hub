import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { recipeCreateBody, recipesListQuery } from "@/lib/assistant/schemasRecipes";
import { getRecipe, listRecipes } from "@/lib/assistant/recipeReads";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { createRecipeRow } from "@/lib/recipeWrites";
import type { z } from "zod";

export const GET = assistantRoute({
  action: "recipes.list",
  query: recipesListQuery,
  handler: async ({ query }) => ({ data: { recipes: await listRecipes(query) } }),
});

export const POST = assistantRoute<Record<string, never>, z.output<typeof recipeCreateBody>>({
  action: "recipes.create",
  body: recipeCreateBody,
  handler: async ({ request, body, changes }) => {
    const { cookbookId, tagIds, ingredients, steps, ...rest } = body;
    const result = await createRecipeRow(
      { ...rest, ingredients: ingredients.join("\n"), steps: steps.join("\n") },
      { cookbookId, tagIds },
    );
    if ("error" in result) throw toWriteFailure(result);

    const { recipe, cookbookRecipe, recipeTags } = result;
    changes.push({
      model: "Recipe",
      recordId: recipe.id,
      action: "create",
      summary: { title: recipe.title },
      before: null,
      after: recipe,
    });
    if (cookbookRecipe) {
      changes.push({
        model: "CookbookRecipe",
        recordId: cookbookRecipe.id,
        action: "create",
        summary: { recipeId: recipe.id, cookbookId: cookbookRecipe.cookbookId },
        before: null,
        after: cookbookRecipe,
      });
    }
    for (const row of recipeTags) {
      changes.push({
        model: "RecipeTag",
        recordId: row.id,
        action: "create",
        summary: { recipeId: recipe.id, tagId: row.tagId },
        before: null,
        after: row,
      });
    }

    const saved = await getRecipe(recipe.id, request.nextUrl.origin);
    if (!saved) throw notFound();
    return { status: 201, data: { recipe: saved } };
  },
});
