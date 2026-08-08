import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Estimates calories and macros for one recipe, per serving.
//
// Same split as ingredientParse.ts / voice/parse.ts / mealSuggest.ts: this
// file is the pure Claude call and carries no auth check of its own
// ("server-only", not "use server"). The Server Action in
// src/app/actions/recipes.ts is what calls getVerifiedSession() and does
// the actual database write.
//
// Whole numbers only, per the Recipes v2 plan: an AI estimate doesn't carry
// decimal precision, and 12.4g reads as more precise than it is — so this
// asks the model for integers directly rather than rounding a float
// ourselves, and the schema enforces it.

export type NutritionEstimate = {
  /** Per serving, not per the whole recipe. */
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const SCHEMA = {
  type: "object",
  properties: {
    calories: {
      type: "integer",
      description: "Estimated calories in ONE serving. Whole number.",
    },
    proteinG: {
      type: "integer",
      description: "Estimated grams of protein in ONE serving. Whole number.",
    },
    carbsG: {
      type: "integer",
      description: "Estimated grams of carbohydrate in ONE serving. Whole number.",
    },
    fatG: {
      type: "integer",
      description: "Estimated grams of fat in ONE serving. Whole number.",
    },
  },
  required: ["calories", "proteinG", "carbsG", "fatG"],
  additionalProperties: false,
} as const;

const SYSTEM = `You estimate nutrition for home-cooked recipes.

Given a recipe's title, its ingredient list, and how many servings the whole
recipe makes, estimate the calories, protein, carbohydrate, and fat in ONE
serving — not the whole recipe.

Rules:
- Base the estimate on standard nutrition data for the ingredients as
  written, in the quantities given, divided across the stated number of
  servings.
- Return whole numbers only. Round to the nearest gram / calorie.
- This is a rough estimate for a household to plan meals with, not a lab
  measurement — a reasonable, real-world estimate is exactly what's wanted.
- If an ingredient's quantity is missing or vague ("a pinch", "to taste"),
  use a typical home-cooking amount rather than treating it as zero.
- Garnishes and truly optional ingredients can be estimated lightly, but
  don't ignore any ingredient that meaningfully contributes calories.`;

/**
 * Ask Claude for a per-serving nutrition estimate.
 *
 * Throws on a genuine API failure or an unparseable response — the caller
 * (computeNutrition in recipes.ts) is what turns that into a clean inline
 * error, the same "never let an AI outage look like a data problem" pattern
 * as classifyRecipeIngredients and suggestMealsForSlot.
 */
export async function estimateNutrition(
  title: string,
  ingredients: string,
  servings: number,
): Promise<NutritionEstimate> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Recipe: ${title}\n\nMakes ${servings} serving${servings === 1 ? "" : "s"}.\n\nIngredients:\n${ingredients}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No response from the nutrition estimate.");
  }

  const parsed = JSON.parse(block.text) as Partial<NutritionEstimate>;
  const { calories, proteinG, carbsG, fatG } = parsed;
  if (
    !Number.isFinite(calories) ||
    !Number.isFinite(proteinG) ||
    !Number.isFinite(carbsG) ||
    !Number.isFinite(fatG)
  ) {
    throw new Error("Malformed nutrition estimate.");
  }

  return {
    calories: Math.round(calories!),
    proteinG: Math.round(proteinG!),
    carbsG: Math.round(carbsG!),
    fatG: Math.round(fatG!),
  };
}
