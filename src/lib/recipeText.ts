/** Splits a newline-separated field (ingredients/steps) into trimmed,
 * non-empty lines — shared by every view that renders a recipe's stored
 * text columns (the private detail page and the public share page). */
export function recipeLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
