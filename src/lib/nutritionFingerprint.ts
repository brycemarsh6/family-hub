import { createHash } from "node:crypto";

/**
 * A short, stable fingerprint of a recipe's ingredients text.
 *
 * Stored on `Recipe.nutritionFingerprint` at the moment nutrition is
 * computed; recomputed fresh from the current `ingredients` on every render
 * so a mismatch means "the ingredient list changed since this was
 * calculated" — see Recipe.nutritionFingerprint's own doc comment for why
 * that distinction matters (a stale estimate silently describing a
 * different recipe).
 *
 * Plain function, no directive: it needs to run both inside the guarded
 * Server Action that writes the fingerprint and inside the Server Component
 * that reads it back to decide whether to show the "older ingredient list"
 * notice — there's nothing sensitive in a hash of already-visible text, so
 * it doesn't need "server-only" the way the Claude call does.
 */
export function fingerprintIngredients(ingredients: string): string {
  return createHash("sha256").update(ingredients.trim()).digest("hex");
}
