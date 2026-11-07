import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError, notFound } from "@/lib/assistant/errors";
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
      throw new ApiError(
        503,
        "ai_unavailable",
        "Couldn't reach the AI to read the ingredients just now. Try again in a moment.",
      );
    }
    if (result.status === "recipe_missing") throw notFound();
    return {
      data: toShortfall(params.id, result.status === "ok" ? result.suggestions : null),
    };
  },
});
