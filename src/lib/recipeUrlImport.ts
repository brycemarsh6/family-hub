import "server-only";
import {
  extractRecipeFromText,
  hasRecipeContent,
  type ExtractedRecipe,
} from "@/lib/recipeExtract";

// The flaky import path, built last on purpose so nothing else depends on
// it. Three routes depending on the host:
//
//   tiktok.com     -> the public oEmbed endpoint returns the video's
//                     caption; run it through the same text extraction
//                     R3a already built. If the recipe is only spoken in
//                     the video, there's genuinely no text to fetch — the
//                     honest answer is "screenshot it" (photo import).
//   pinterest.com   -> pins usually wrap a link to the source blog. Fetch
//   / pin.it           the pin, dig the outbound link out of its embedded
//                     page data, follow it once, then treat it exactly
//                     like a blog URL below.
//   anything else   -> try schema.org JSON-LD Recipe data first (exact,
//                     free, no model call). If it's not there, strip the
//                     page to text and run the same text extraction.
//
// Every failure lands on a specific, actionable message — never a dead end.

export type UrlImportResult = {
  data?: ExtractedRecipe;
  /** The URL actually worth recording as the recipe's source — for
   * Pinterest this is the blog the pin pointed to, not the pin itself. */
  sourceUrl?: string;
  error?: string;
};

const FETCH_TIMEOUT_MS = 10_000;
const MAX_STRIPPED_TEXT_LENGTH = 15_000;

const SCREENSHOT_HINT =
  "Screenshot the recipe and use photo import instead.";

const BROWSER_HEADERS: HeadersInit = {
  // A real browser UA — some recipe sites (AllRecipes, SimplyRecipes, at
  // minimum) return a flat 403 to Node's default fetch UA. This is a
  // household app fetching one page a family member explicitly linked to,
  // not a scraper — blending in avoids that specific, real block.
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

async function fetchWithTimeout(
  url: string,
  headers?: HeadersInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

function isTikTok(host: string): boolean {
  return host.endsWith("tiktok.com");
}

function isPinterest(host: string): boolean {
  return host.endsWith("pinterest.com") || host === "pin.it";
}

/**
 * Entry point: figure out what kind of link this is and route accordingly.
 * Never throws — a fetch failure, timeout, or anything else unexpected
 * lands as a normal error result, same as every other outcome here.
 */
export async function importRecipeFromUrl(
  rawUrl: string,
): Promise<UrlImportResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { error: "That doesn't look like a valid link." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "That doesn't look like a valid link." };
  }

  try {
    const host = url.hostname.toLowerCase();
    if (isTikTok(host)) return await importFromTikTok(url.toString());
    if (isPinterest(host)) return await importFromPinterest(url.toString());
    return await importFromBlog(url.toString());
  } catch {
    return {
      error: `Couldn't read that link. ${SCREENSHOT_HINT}`,
    };
  }
}

async function importFromTikTok(pageUrl: string): Promise<UrlImportResult> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(pageUrl)}`;
  const response = await fetchWithTimeout(oembedUrl);
  if (!response.ok) {
    return {
      error: `Couldn't read that TikTok. If the recipe is only spoken in the video, there's nothing to read — ${SCREENSHOT_HINT.toLowerCase()}`,
    };
  }

  const body = (await response.json()) as { title?: string };
  const caption = body.title?.trim();
  if (!caption) {
    return {
      error: `Couldn't read that TikTok. If the recipe is only spoken in the video, there's nothing to read — ${SCREENSHOT_HINT.toLowerCase()}`,
    };
  }

  const extracted = await extractRecipeFromText(caption);
  if (!hasRecipeContent(extracted)) {
    return {
      error: `That TikTok's caption doesn't have the recipe in it. If it's only spoken in the video, ${SCREENSHOT_HINT.toLowerCase()}`,
    };
  }

  return { data: extracted, sourceUrl: pageUrl };
}

async function importFromPinterest(pinUrl: string): Promise<UrlImportResult> {
  const pinterestFallback = {
    error: `Couldn't find a source link on that pin. ${SCREENSHOT_HINT}`,
  };

  const response = await fetchWithTimeout(pinUrl, BROWSER_HEADERS);
  if (!response.ok) return pinterestFallback;

  const html = await response.text();
  const sourceLink = findPinterestSourceLink(html);
  if (!sourceLink) return pinterestFallback;

  // Follow the outbound link once and treat it like any other blog URL —
  // this is where a Pinterest pin actually becomes readable.
  return importFromBlog(sourceLink);
}

/**
 * Find the blog a pin points at.
 *
 * The `og:see_also` meta tag is what actually works for a signed-out
 * fetch — verified against a real pin. Pinterest's embedded `__PWS_DATA__`
 * JSON *looks* like the obvious place to find the pin's `link` field, but
 * for an anonymous request that payload doesn't include the pin's own
 * record at all (it's fetched client-side after load), so the JSON walk
 * below finds nothing on its own. It stays as a second pass because it
 * costs nothing and covers pins whose markup differs.
 */
function findPinterestSourceLink(html: string): string | null {
  const seeAlso = /<meta[^>]+(?:property|name)=["']og:see_also["'][^>]*>/i.exec(
    html,
  );
  if (seeAlso) {
    const content = /content=["']([^"']+)["']/i.exec(seeAlso[0]);
    if (content && isExternalLink(content[1])) return content[1];
  }

  const blocks = html.matchAll(
    /<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const found = findLinkField(data);
    if (found) return found;
  }
  return null;
}

function findLinkField(value: unknown, depth = 0): string | null {
  if (depth > 12 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findLinkField(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.link === "string" && isExternalLink(obj.link)) {
      return obj.link;
    }
    for (const key of Object.keys(obj)) {
      const found = findLinkField(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function isExternalLink(link: string): boolean {
  try {
    const parsed = new URL(link);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return !host.endsWith("pinterest.com") && !host.endsWith("pinimg.com");
  } catch {
    return false;
  }
}

async function importFromBlog(pageUrl: string): Promise<UrlImportResult> {
  const response = await fetchWithTimeout(pageUrl, BROWSER_HEADERS);
  if (!response.ok) {
    return {
      error: `Couldn't load that page (error ${response.status}). Try pasting the recipe text instead.`,
    };
  }

  const html = await response.text();

  const structured = extractJsonLdRecipe(html);
  if (structured && hasRecipeContent(structured)) {
    return { data: structured, sourceUrl: pageUrl };
  }

  const text = stripHtmlToText(html, MAX_STRIPPED_TEXT_LENGTH);
  if (!text) {
    return { error: "Couldn't read that page. Try pasting the recipe text instead." };
  }

  const extracted = await extractRecipeFromText(text);
  if (!hasRecipeContent(extracted)) {
    return {
      error: `Couldn't find a recipe on that page. Try pasting the recipe text directly, or ${SCREENSHOT_HINT.toLowerCase()}`,
    };
  }

  return { data: extracted, sourceUrl: pageUrl };
}

// ---- schema.org JSON-LD Recipe parsing ----

function extractJsonLdRecipe(html: string): ExtractedRecipe | null {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const recipe = findRecipeNode(data);
    if (recipe) return normalizeJsonLdRecipe(recipe);
  }
  return null;
}

/** JSON-LD recipes show up three ways in the wild: the top-level object
 * itself, one entry in a top-level array, or nested inside an "@graph"
 * array — and "@type" can be a bare string or an array of types. */
function findRecipeNode(
  data: unknown,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > 4 || data == null) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Recipe")) return obj;
    if (Array.isArray(obj["@graph"])) {
      return findRecipeNode(obj["@graph"], depth + 1);
    }
  }
  return null;
}

function normalizeJsonLdRecipe(recipe: Record<string, unknown>): ExtractedRecipe {
  return {
    title: decodeHtmlEntities(asString(recipe.name)),
    ingredients: asStringArray(recipe.recipeIngredient).map(decodeHtmlEntities),
    steps: flattenInstructions(recipe.recipeInstructions).map(decodeHtmlEntities),
    servings: decodeHtmlEntities(asYieldString(recipe.recipeYield)),
    prepTime: parseISODuration(asString(recipe.prepTime)),
    cookTime: parseISODuration(asString(recipe.cookTime)),
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") return [value.trim()].filter(Boolean);
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function asYieldString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const strings = value.filter((v): v is string => typeof v === "string");
    // Real pages put the plain count first and the descriptive form last
    // ("2", "2 1/2 cups guacamole") — the descriptive one is more useful.
    return strings[strings.length - 1] ?? "";
  }
  return "";
}

/** recipeInstructions shows up as a plain string, a flat array of strings
 * or HowToStep objects, or HowToSection groups (each with its own
 * itemListElement array) for recipes with multiple parts — flatten all of
 * it into one ordered list, since the app's schema has no concept of
 * sub-sections. */
function flattenInstructions(value: unknown): string[] {
  if (typeof value === "string") return [value.trim()].filter(Boolean);
  if (!Array.isArray(value)) return [];

  const steps: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      steps.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (obj["@type"] === "HowToSection" && Array.isArray(obj.itemListElement)) {
        steps.push(...flattenInstructions(obj.itemListElement));
        continue;
      }
      if (typeof obj.text === "string") {
        steps.push(obj.text.trim());
      }
    }
  }
  return steps.filter(Boolean);
}

/** "PT1H30M" -> "1 hr 30 min". Schema.org durations are ISO 8601; recipe
 * sites only ever use the day/hour/minute/second fields. */
function parseISODuration(iso: string): string {
  if (!iso) return "";
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return "";

  const [, days, hours, minutes, seconds] = match;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === "1" ? "" : "s"}`);
  if (hours) parts.push(`${hours} hr`);
  if (minutes) parts.push(`${minutes} min`);
  if (!days && !hours && !minutes && seconds) parts.push(`${seconds} sec`);
  return parts.join(" ");
}

// ---- plain-text fallback for pages with no JSON-LD ----

function stripHtmlToText(html: string, maxLength: number): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withoutTags = withoutNoise.replace(/<[^>]+>/g, " ");
  const collapsed = decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
  return collapsed.slice(0, maxLength);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  deg: "°",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  eacute: "é",
  egrave: "è",
  ntilde: "ñ",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
};

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, ref: string) => {
    if (ref[0] === "#") {
      const codePoint =
        ref[1] === "x" || ref[1] === "X"
          ? parseInt(ref.slice(2), 16)
          : parseInt(ref.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : whole;
    }
    return NAMED_ENTITIES[ref] ?? whole;
  });
}
