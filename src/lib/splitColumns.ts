// Splitting a list into side-by-side columns without anything jumping.
//
// On wide pages (STRUCTURE.md "Wide pages") a list of groups sits in 2 or 3
// columns. CSS columns would balance by measured height, so opening or
// closing a group would move other groups between columns. This split is
// decided in JavaScript from the ORDER and the WEIGHTS only (a group's row
// count, never its open or closed state or its pixel height), so a group
// never changes column when it is opened or closed. Pure: no React, no DOM.

/**
 * The one JavaScript home of the column thresholds (the `@min-[48rem]:` and
 * `@min-[64rem]:` classes are their CSS mirror): the narrowest container, in
 * pixels, that gets 2 or 3 columns. They match the plan's container
 * breakpoints (2 columns from a 768px container, 3 from 1024px), see
 * `.avengers/plans/ipad-landscape-v1.md` rule 2.
 */
export const COLUMN_MIN_WIDTH_PX = { 2: 768, 3: 1024 } as const;

/**
 * How many columns a container of `widthPx` gets, never more than
 * `maxColumns`. A width of 0 (not measured yet) gives 1.
 */
export function columnCountFor(
  widthPx: number,
  maxColumns: 1 | 2 | 3,
): 1 | 2 | 3 {
  let count: 1 | 2 | 3 = 1;
  if (widthPx >= COLUMN_MIN_WIDTH_PX[3]) count = 3;
  else if (widthPx >= COLUMN_MIN_WIDTH_PX[2]) count = 2;
  return count > maxColumns ? maxColumns : count;
}

/**
 * Splits `items` into exactly `columns` arrays (some may be empty), keeping
 * order: column 1 holds a prefix, column 2 the next run, and so on. Before an
 * item is added, the split asks where the middle of that item sits. If the
 * middle is at or past the line where the current column's fair share of the
 * total weight ends (k/columns of the total, for k = 1 to columns - 1), the
 * item starts the next column. So a heavy last group gets a column of its own
 * instead of landing on top of everything before it. Weights below 1 count
 * as 1.
 */
export function splitByWeight<T>(
  items: readonly T[],
  columns: number,
  weightOf: (item: T) => number,
): T[][] {
  if (columns <= 1) return [items.slice()];
  const weights = items.map((item) => Math.max(1, weightOf(item)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  const result: T[][] = Array.from({ length: columns }, () => []);

  let column = 0;
  let running = 0;
  items.forEach((item, i) => {
    // Move on one column at most per item, so a huge item can never leave
    // an empty column in the middle, and never cut before a column's first item.
    if (
      result[column].length > 0 &&
      column < columns - 1 &&
      (running + weights[i] / 2) * columns >= (column + 1) * total
    ) {
      column += 1;
    }
    result[column].push(item);
    running += weights[i];
  });
  return result;
}
