// Class strings that a component and its loading skeleton must share, written
// once (Captain's A-L2-3). Plain constants (no React) so a server `loading.tsx`
// can import them. They stay full literal strings because Tailwind finds
// class names by scanning source text.

/** The Calendar's Year grid: 2 across, 3 from a 40rem container, 4 from 60rem (mission-46). */
export const YEAR_GRID_CLASSES = "grid grid-cols-2 gap-3 @min-[40rem]:grid-cols-3 @min-[60rem]:grid-cols-4";

/** Habits & Chores Today's time-of-day columns: 1 across, 2 from a 40rem container, 4 from 60rem (mission 53). */
export const HABITS_DAY_GRID_CLASSES = "grid grid-cols-1 items-start gap-3 @min-[40rem]:grid-cols-2 @min-[60rem]:grid-cols-4";

/** Long forms (habit, goal, event, recipe): one column, two from a 48rem container (mission 54). Changes together with TWO_COLUMN_CLASSES. */
export const FORM_GRID_CLASSES = "grid grid-cols-1 gap-y-4 @min-[48rem]:grid-cols-2 @min-[48rem]:items-start @min-[48rem]:gap-x-8";

/** One column of a long form: its fields stacked (mission 54). */
export const FORM_COLUMN_CLASSES = "flex min-w-0 flex-col gap-4";

/** A form row that spans both columns from 48rem, like the recipe title and its meta row (mission 54). */
export const FORM_SPAN_CLASSES = "@min-[48rem]:col-span-2";

/** The Save button's wide look: natural width, right-aligned, from 48rem (mission 54). */
export const FORM_SAVE_WIDE_CLASSES = "@min-[48rem]:w-auto @min-[48rem]:self-end @min-[48rem]:px-8";

/** A form's small label above its title, hidden on a phone and shown from 48rem (mission 54). */
export const FORM_EYEBROW_CLASSES = "hidden text-xs font-semibold uppercase tracking-wide text-muted @min-[48rem]:block";

/** Settings and Manage family: two columns from 48rem, no row gap because their cards carry margins. Changes together with FORM_GRID_CLASSES (mission 54). */
export const TWO_COLUMN_CLASSES = "grid grid-cols-1 @min-[48rem]:grid-cols-2 @min-[48rem]:items-start @min-[48rem]:gap-x-8";

/** Short pages (task, import, Add recipe, Profile): content capped at 40rem inside a wide page (mission 54). */
export const NARROW_PAGE_CLASSES = "mx-auto w-full max-w-[40rem]";

/** Cancels `<main>`'s `px-4` (AppChrome.tsx) so a grid runs edge to edge; the two change together (mission 67). */
export const PAGE_BLEED_CLASSES = "-mx-4";

/** The Calendar top bar's row of six views: hidden until the bar (a `@container`) is 48rem wide (the row is 25.8rem, the widest title 12rem, the rest 9.5rem), then shown; the View circle hides at the same width, so the two change together (mission 67). */
export const CALENDAR_VIEW_ROW_CLASSES =
  "hidden rounded-full bg-surface-2 px-[0.1875rem] @min-[48rem]:flex";

/** The View circle's wrapper: gone from 48rem, where the row of six replaces it. Changes together with CALENDAR_VIEW_ROW_CLASSES (mission 67). */
export const CALENDAR_VIEW_CIRCLE_CLASSES = "@min-[48rem]:hidden";

/** The Calendar's month panel and its view: stacked (the panel drops down above the view) until the Calendar body is 768px wide (COLUMN_MIN_WIDTH_PX[2], px by design, STRUCTURE.md "Wide pages"), then side by side on Schedule, Day, 3 Day and Week (mission 72). Changes together with the three below. */
export const MONTH_PANEL_ROW_CLASSES = "@min-[768px]:flex @min-[768px]:items-start";

/** The panel when it sits beside the view: an 18rem left column with a line between; stacked, a line under it (mission 72). */
export const MONTH_PANEL_SIDE_CLASSES =
  "mb-4 border-b border-line @min-[768px]:mb-0 @min-[768px]:w-72 @min-[768px]:shrink-0 @min-[768px]:border-b-0 @min-[768px]:border-r @min-[768px]:pr-4";

/** The view beside the panel: takes the rest of the row, and its 1rem left padding cancels the timeline's edge-to-edge bleed so the hour rail starts at the panel's line (mission 72). */
export const MONTH_PANEL_BESIDE_VIEW_CLASSES = "@min-[768px]:min-w-0 @min-[768px]:flex-1 @min-[768px]:pl-4";
