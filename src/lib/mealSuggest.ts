import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Asks Claude what the household could actually make right now, given what's
// really in the kitchen.
//
// Same split as src/lib/voice/parse.ts: this file is the pure Claude call and
// carries no auth check of its own ("server-only", not "use server"). The
// Server Action in src/app/actions/mealPlans.ts is what calls
// getVerifiedSession() before reaching this.
//
// THE GROUNDING RULE, and why it's the whole design:
// recipes are handed to the model as an INDEXED list, and a recipe suggestion
// comes back as an index — never as a name we'd then have to match. Fuzzy
// name-matching is exactly what filed real steaks under Beverages during the
// inventory import ("tea" is a substring of "steaks") and what put a 10-day
// expiry on a can of Dr Pepper Zero. There's no reason to re-open that class
// of bug here when an integer is unambiguous.

/** One idea handed back to the client. Exactly one of the two shapes. */
export type MealSuggestion =
  | { kind: "recipe"; recipeId: string; title: string; why: string }
  | { kind: "idea"; title: string; why: string };

/** What the caller passes in — already fetched and filtered server-side. */
export type SuggestInput = {
  slot: string;
  /** In-stock pantry items, name + how much is there. */
  inventory: { name: string; quantity: number; unit: string }[];
  /** Items worth using up first, soonest first. */
  expiringSoon: { name: string; daysLeft: number }[];
  /** The household's real recipe library, in the order sent to the model. */
  recipes: { id: string; title: string; ingredients: string }[];
};

const SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      description:
        "Between 2 and 4 things the household could make for this meal. " +
        "Empty only if the inventory genuinely supports nothing.",
      items: {
        type: "object",
        properties: {
          recipeIndex: {
            type: "integer",
            description:
              "The 0-based index of a recipe from the numbered recipe list, " +
              "when this suggestion IS one of those recipes. Use -1 for a " +
              "freeform idea that isn't in the library.",
          },
          title: {
            type: "string",
            description:
              "What to call the meal. For a recipe suggestion, repeat that " +
              "recipe's exact title. For a freeform idea, a short dish name.",
          },
          why: {
            type: "string",
            description:
              "One short sentence naming the on-hand items it uses. Mention " +
              "anything expiring soon that it would use up. No more than " +
              "about 15 words.",
          },
        },
        required: ["recipeIndex", "title", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
} as const;

const SYSTEM = `You help a family decide what to cook using food they already have.

You are given: the meal slot being planned, everything currently in the
kitchen, which items are close to going bad, and the family's own saved
recipes as a numbered list.

Rules:
- Suggest 2-4 options. Prefer meals that use up the soon-to-expire items.
- Strongly prefer the family's own recipes when one genuinely fits what's in
  stock. Set recipeIndex to that recipe's number from the list.
- A freeform idea (recipeIndex -1) is fine when no saved recipe fits, but it
  must still be makeable from the listed inventory.
- Only suggest things the inventory actually supports. Assume basic staples
  (salt, pepper, oil, water) are always available; assume nothing else.
- Match the meal slot: breakfast food for Breakfast, something snack-sized
  for Snacks.
- Each "why" is one short sentence naming the actual on-hand items used.
- Never invent inventory items or recipes that weren't listed.`;

/** Caps so a 460-item pantry can't balloon the prompt. Household scale is
 * small enough that these are generous, not lossy in practice. */
const MAX_INVENTORY = 200;
const MAX_RECIPES = 60;

function buildPrompt(input: SuggestInput): string {
  const inventory = input.inventory
    .slice(0, MAX_INVENTORY)
    .map((item) =>
      item.unit
        ? `- ${item.name} (${item.quantity} ${item.unit})`
        : `- ${item.name} (${item.quantity})`,
    )
    .join("\n");

  const expiring = input.expiringSoon.length
    ? input.expiringSoon
        .map((item) => `- ${item.name} (${item.daysLeft} days left)`)
        .join("\n")
    : "(nothing expiring soon)";

  // The index in this list is the contract with the model — it's what comes
  // back as recipeIndex, and what resolveSuggestions() looks up. Keep the
  // slice and the numbering in one place so they can't drift apart.
  const recipes = input.recipes.length
    ? input.recipes
        .slice(0, MAX_RECIPES)
        .map(
          (recipe, index) =>
            `${index}. ${recipe.title}\n   ingredients: ${recipe.ingredients
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .join("; ")}`,
        )
        .join("\n")
    : "(no saved recipes yet)";

  return `Meal slot: ${input.slot}

USE THESE UP FIRST (expiring soon):
${expiring}

IN THE KITCHEN:
${inventory}

THE FAMILY'S SAVED RECIPES (use the number as recipeIndex):
${recipes}`;
}

/**
 * Turn the model's raw reply into suggestions the client can act on.
 *
 * A recipeIndex only becomes a recipe suggestion if it points at a real entry
 * in the same list we sent. Anything out of range degrades to a freeform idea
 * rather than producing a dead link — the model choosing a bad number should
 * cost the user nothing.
 */
function resolveSuggestions(
  raw: { recipeIndex: number; title: string; why: string }[],
  recipes: SuggestInput["recipes"],
): MealSuggestion[] {
  const sent = recipes.slice(0, MAX_RECIPES);

  return raw.flatMap((item): MealSuggestion[] => {
    const why = item.why?.trim() ?? "";
    const recipe =
      Number.isInteger(item.recipeIndex) &&
      item.recipeIndex >= 0 &&
      item.recipeIndex < sent.length
        ? sent[item.recipeIndex]
        : null;

    if (recipe) {
      // Trust the library's own title over the model's echo of it.
      return [{ kind: "recipe", recipeId: recipe.id, title: recipe.title, why }];
    }

    const title = item.title?.trim() ?? "";
    if (!title) return [];
    return [{ kind: "idea", title, why }];
  });
}

/**
 * Ask Claude for meal ideas. Read-only — this never touches the database, and
 * nothing lands in a slot until the user taps a suggestion.
 */
export async function suggestMeals(
  input: SuggestInput,
): Promise<MealSuggestion[]> {
  // Constructed per call, same reasoning as voice/parse.ts: a missing API key
  // should fail this one request with a clear message, not crash the app.
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return [];

  // Structured outputs guarantee the shape, but a refusal or a hit token
  // ceiling can still end a turn early — so this stays defensive.
  try {
    const parsed = JSON.parse(block.text) as {
      suggestions?: { recipeIndex: number; title: string; why: string }[];
    };
    if (!Array.isArray(parsed.suggestions)) return [];
    return resolveSuggestions(parsed.suggestions, input.recipes);
  } catch {
    return [];
  }
}
