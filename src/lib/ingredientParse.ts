import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Turns a recipe's free-text ingredient lines into plain, shoppable item
// names — "1 cup sliced bell pepper" becomes "bell pepper".
//
// Same split as src/lib/voice/parse.ts and src/lib/mealSuggest.ts: this file
// is the pure Claude call and carries no auth check of its own ("server-only",
// not "use server"). The Server Action in src/app/actions/groceries.ts is what
// calls getVerifiedSession() before reaching this.
//
// THE GROUNDING RULE, same as mealSuggest.ts: lines go to the model as a
// NUMBERED list and come back as a `lineIndex`, never as an echoed copy of
// the line text. Matching the model's echo back to our own list would be
// exactly the fuzzy name-matching this codebase has been bitten by twice
// (steaks/"tea", Dr Pepper/"bell peppers"). An integer is unambiguous, and an
// out-of-range one is dropped rather than guessed at.
//
// Deliberately NOT structured quantities. Ingredients stay one text column
// per the Recipes plan, and parsing "1 1/2 cups" into a number + unit is the
// structured-ingredients work that's explicitly deferred (see the "not in v2"
// list in CLAUDE.md). This only needs a name good enough to match against the
// inventory and to read on a shopping list.

export type ParsedIngredient = {
  /** Index into the ingredient lines that were sent. */
  lineIndex: number;
  /** The shoppable item name, stripped of quantity, unit, and prep. */
  name: string;
};

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description:
        "One entry per line that names something you'd actually buy. " +
        "Skip section headers and lines that aren't shoppable.",
      items: {
        type: "object",
        properties: {
          lineIndex: {
            type: "integer",
            description:
              "The 0-based number of the ingredient line this came from, " +
              "exactly as given in the numbered list.",
          },
          name: {
            type: "string",
            description:
              "Just the item, singular where natural: no quantity, no unit, " +
              "no preparation. '2 cups shredded sharp cheddar' -> " +
              "'sharp cheddar'. Keep brand names when the line gives one.",
          },
        },
        required: ["lineIndex", "name"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

const SYSTEM = `You turn recipe ingredient lines into plain shopping-list item names.

For each numbered line, return the thing a person would actually put on a
shopping list — the item itself, without the amount, the unit, or how it gets
prepared.

Rules:
- Strip quantities and units: "1 1/2 cups flour" -> "flour".
- Strip preparation: "1 onion, finely diced" -> "onion". "2 cups shredded
  mozzarella" -> "mozzarella".
- Keep the descriptors that change what you'd buy: "whole wheat flour",
  "low-sodium chicken broth", "sharp cheddar" — these are different products.
- Keep brand names when the line gives one ("Pace chunky salsa").
- Combine nothing. One line in, at most one item out.
- Skip section headers ("For the dressing:", "Topping").
- Skip water, and skip lines that name no ingredient at all.
- Never invent an ingredient that isn't on the line.`;

/**
 * Ask Claude for the shoppable name of each ingredient line.
 *
 * Returns only entries whose `lineIndex` points at a real line we sent —
 * a bad index is dropped rather than silently attached to the wrong
 * ingredient.
 */
export async function parseIngredientNames(
  lines: string[],
): Promise<ParsedIngredient[]> {
  if (lines.length === 0) return [];

  // Constructed per call, same reasoning as voice/parse.ts: a missing API key
  // should fail this one request with a clear message, not crash the app.
  const client = new Anthropic();

  const numbered = lines.map((line, index) => `${index}. ${line}`).join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: numbered }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return [];

  // Structured outputs guarantee the shape, but a refusal or a hit token
  // ceiling can still end a turn early — so this stays defensive.
  try {
    const parsed = JSON.parse(block.text) as { items?: ParsedIngredient[] };
    if (!Array.isArray(parsed.items)) return [];

    return parsed.items.filter(
      (item) =>
        Number.isInteger(item.lineIndex) &&
        item.lineIndex >= 0 &&
        item.lineIndex < lines.length &&
        typeof item.name === "string" &&
        item.name.trim().length > 0,
    );
  } catch {
    return [];
  }
}
