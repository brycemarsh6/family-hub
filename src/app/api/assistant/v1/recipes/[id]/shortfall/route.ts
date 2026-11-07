import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { aiUnavailable, notFound } from "@/lib/assistant/errors";
import { toShortfall } from "@/lib/assistant/serializeRecipes";
import { IngredientAiError, classifyRecipe } from "@/lib/recipeIngredientMatch";

export const GET = assistantRoute<{ id: string }>({
  action: "recipes.shortfall",
  handler: async ({ params }) => {
    let result;
    try {
      result = await classifyRecipe(params.id);
    } catch (error) {
      if (!(error instanceof IngredientAiError)) throw error;
      console.error("[assistant] ingredient reader failed:", error.original);
      throw aiUnavailable();
    }
    if (result.status === "recipe_missing") throw notFound();
    return {
      data: toShortfall(params.id, result.status === "ok" ? result.suggestions : null),
    };
  },
});
