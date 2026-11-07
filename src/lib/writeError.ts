// The refusal every write module hands back (mission 45, C1). Pure, no
// imports: `tagWrites.ts`, `recipeWrites.ts`, `mealPlanWrites.ts` and
// `cookbookWrites.ts` return it, the actions show `error` as the family
// always saw it, and the Assistant API turns `code` into a 404 or a 400
// (`toWriteFailure` in `assistant/errors.ts`) without matching message text.

/** `missing`: something named doesn't exist (404). `invalid`: bad input (400). */
export type WriteError = { error: string; code: "missing" | "invalid" };

export function invalid(error: string): WriteError {
  return { error, code: "invalid" };
}

export function missing(error: string): WriteError {
  return { error, code: "missing" };
}

/** The one wording for a recipe gone from under the caller. */
export const RECIPE_MISSING: WriteError = missing("That recipe no longer exists.");
