import type { WidgetSize } from "./dashboardWidgets";

// Pure placement for the dashboard grid: how many cells a size covers and
// where each widget lands (decisions 201, 202). The grid is 2 columns on
// phones and 4 from the md breakpoint up. Placement is explicit, never
// `grid-auto-flow: dense`: the page keeps the DOM in the person's list order
// and gives each cell its row and column through CSS custom properties, one
// pair per column count. No React, no db.

export type GridColumns = 2 | 4;
export type GridCell = { row: number; col: number; w: number; h: number };

/** Cells a size covers: Small 1x1, Medium 2x1, Large 2x2, Extra large the full width by 2. */
export function cellsOf(size: WidgetSize, columns: GridColumns): { w: number; h: number } {
  switch (size) {
    case "s":
      return { w: 1, h: 1 };
    case "m":
      return { w: 2, h: 1 };
    case "l":
      return { w: 2, h: 2 };
    case "xl":
      return { w: columns, h: 2 };
  }
}

/**
 * One cell per size, in the same order, 1-based for CSS. First fit: each
 * widget takes the top-most, then left-most, free spot its cells fit, so a
 * later Small fills a hole an earlier widget left (decision 202).
 */
export function packWidgets(sizes: WidgetSize[], columns: GridColumns): GridCell[] {
  const taken = new Set<string>();
  const free = (row: number, col: number, w: number, h: number) => {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) if (taken.has(`${r},${c}`)) return false;
    }
    return true;
  };
  return sizes.map((size) => {
    const { w, h } = cellsOf(size, columns);
    for (let row = 1; ; row++) {
      for (let col = 1; col + w - 1 <= columns; col++) {
        if (!free(row, col, w, h)) continue;
        for (let r = row; r < row + h; r++) {
          for (let c = col; c < col + w; c++) taken.add(`${r},${c}`);
        }
        return { row, col, w, h };
      }
    }
  });
}

export type GridAreaVars = {
  "--dash-r2": string;
  "--dash-c2": string;
  "--dash-r4": string;
  "--dash-c4": string;
};

const span = (start: number, count: number) => `${start} / span ${count}`;

/** Per widget, the CSS custom properties that place it at 2 and at 4 columns, as "<start> / span <n>". */
export function gridAreaVars(sizes: WidgetSize[]): GridAreaVars[] {
  const two = packWidgets(sizes, 2);
  const four = packWidgets(sizes, 4);
  return sizes.map((_, i) => ({
    "--dash-r2": span(two[i].row, two[i].h),
    "--dash-c2": span(two[i].col, two[i].w),
    "--dash-r4": span(four[i].row, four[i].h),
    "--dash-c4": span(four[i].col, four[i].w),
  }));
}
