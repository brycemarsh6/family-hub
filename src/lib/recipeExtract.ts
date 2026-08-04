import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Turns raw pasted text — usually copy-pasted straight off a recipe blog,
// life story and ads included — into structured recipe fields. Same
// technique as src/lib/voice/parse.ts: structured outputs constrain the
// reply to a schema, so this returns real fields instead of prose we'd have
// to scrape ourselves.

export type ExtractedRecipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  servings: string;
  prepTime: string;
  cookTime: string;
};

const EMPTY: ExtractedRecipe = {
  title: "",
  ingredients: [],
  steps: [],
  servings: "",
  prepTime: "",
  cookTime: "",
};

const SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description:
        "The recipe's own name — not the blog post's title if they differ, " +
        "and not the site name. Empty string if no recipe is present.",
    },
    ingredients: {
      type: "array",
      items: { type: "string" },
      description:
        "One ingredient per entry, quantities and units kept exactly as " +
        "written in the source (\"2 cups flour\", not \"flour\"). Empty " +
        "array if none found.",
    },
    steps: {
      type: "array",
      items: { type: "string" },
      description:
        "One instructional step per entry, in the order they should be " +
        "done. Skip photography tips, life-story asides, and ads mixed " +
        "into the method. Empty array if none found.",
    },
    servings: {
      type: "string",
      description:
        "How many it serves, exactly as stated (e.g. \"6-8\", \"4 " +
        "servings\"). Empty string if not mentioned — never guess.",
    },
    prepTime: {
      type: "string",
      description: "Prep time exactly as stated. Empty string if not mentioned.",
    },
    cookTime: {
      type: "string",
      description: "Cook time exactly as stated. Empty string if not mentioned.",
    },
  },
  required: ["title", "ingredients", "steps", "servings", "prepTime", "cookTime"],
  additionalProperties: false,
} as const;

const SYSTEM_TEXT = `You extract recipes from raw pasted text. It is almost always copied
straight off a recipe blog, so it's full of site navigation, ads, a long
personal story before the recipe, comments, and unrelated content. Find the
actual recipe within that noise and extract only it.

Rules:
- Ingredients and steps are extracted exactly as written — don't paraphrase,
  reorder, or invent quantities that aren't in the source.
- Servings, prep time, and cook time are only filled in when explicitly
  stated. Leave them empty rather than estimating.
- If the text has no recognizable recipe in it at all, return an empty
  title, empty ingredients, and empty steps — don't fabricate one.`;

const SYSTEM_PHOTO = `You extract recipes from photos. The photo is one of: a printed cookbook
or magazine page, a handwritten recipe card, or a screenshot (often from
TikTok, Instagram, or Pinterest, which means on-screen UI chrome — likes,
comments, usernames, captions — is mixed in with the actual recipe text).
Read the recipe carefully, including handwriting when present, and extract
only the recipe itself.

Rules:
- Ingredients and steps are extracted exactly as written — don't paraphrase,
  reorder, or invent quantities that aren't legible in the photo.
- Ignore on-screen UI chrome entirely: usernames, like/comment/share counts,
  captions, watermarks, hashtags. None of that is part of the recipe.
- If a photo covers more than one page or screen of the same recipe,
  combine them into one recipe rather than returning duplicates.
- Servings, prep time, and cook time are only filled in when explicitly
  stated. Leave them empty rather than estimating.
- If a word or quantity is genuinely illegible, use your best reading rather
  than leaving a gap — but never invent an ingredient or step that isn't
  there at all.
- If no photo has a recognizable recipe in it, return an empty title, empty
  ingredients, and empty steps — don't fabricate one.`;

/** Whether an extraction actually found anything — every import path
 * (pasted text, photos, URL) uses this to decide "success" vs "nothing
 * here", since structured outputs guarantee the reply's shape but not that
 * any field in it is non-empty. */
export function hasRecipeContent(recipe: ExtractedRecipe): boolean {
  return Boolean(
    recipe.title || recipe.ingredients.length > 0 || recipe.steps.length > 0,
  );
}

/** Parses Claude's structured-output reply into our shape, defensively —
 * structured outputs guarantee the JSON shape, but not that Claude actually
 * finished (a refusal or a hit token ceiling can still end a turn early). */
function parseResponse(response: Anthropic.Message): ExtractedRecipe {
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return EMPTY;

  try {
    const parsed = JSON.parse(block.text) as Partial<ExtractedRecipe>;
    return {
      title: parsed.title ?? "",
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      servings: parsed.servings ?? "",
      prepTime: parsed.prepTime ?? "",
      cookTime: parsed.cookTime ?? "",
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Ask Claude to pull a recipe's fields out of arbitrary pasted text.
 *
 * Returns an all-empty result (never throws) when nothing recipe-shaped is
 * found, or when Claude's reply doesn't parse — the caller decides what an
 * empty result means for the user, this function just doesn't guess.
 */
export async function extractRecipeFromText(
  text: string,
): Promise<ExtractedRecipe> {
  // Constructed per call, not at module load — a missing key should fail
  // this one request with a clear message, not crash the whole app at boot.
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: SYSTEM_TEXT,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: text }],
  });

  return parseResponse(response);
}

export type PhotoInput = {
  /** e.g. "image/jpeg" — must match the client's canvas re-encode output. */
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  /** Base64, no "data:" prefix. */
  data: string;
};

/**
 * Ask Claude to pull a recipe's fields out of up to 3 photos — a cookbook
 * page, a handwritten card, or a screenshot. Same schema and the same
 * never-throws contract as extractRecipeFromText.
 */
export async function extractRecipeFromPhotos(
  photos: PhotoInput[],
): Promise<ExtractedRecipe> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: SYSTEM_PHOTO,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          ...photos.map((photo) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: photo.mediaType,
              data: photo.data,
            },
          })),
          {
            type: "text" as const,
            text:
              photos.length > 1
                ? "These photos are pages of the same recipe."
                : "Extract the recipe from this photo.",
          },
        ],
      },
    ],
  });

  return parseResponse(response);
}
