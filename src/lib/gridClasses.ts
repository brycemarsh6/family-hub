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

/**
 * Width of the Calendar body (a measured `@container` box) from which the
 * month panel may sit beside the view, and from which its open state is
 * remembered per person. 700, not 768: `<main>` keeps `px-4`, so an upright
 * iPad (768) and a sideways one with the pinned Sidebar (1024 - 256) both
 * leave a 736px body.
 *
 * Pixels on purpose, and that is the mission-58 rule, not a slip: a rem
 * would move with Text size (the root font size is raised on tablets), so at
 * Large and above an iPad would drop under the cutoff and lose the side
 * panel exactly where it is wanted. The cutoff must stay a measure of the
 * screen, not of the text. docs/structure/layout.md, "Wide pages", rule 2
 * (and DESIGN.md, px case (c)).
 */
export const MONTH_PANEL_BESIDE_MIN_PX = 700;

/** The side panel's width in rem, so it follows Text size. Changes together with the `w-[21rem]` in MONTH_PANEL_SIDE_CLASSES (gridClasses.test.ts keeps them equal). 21rem leaves its seven day buttons at least 44px wide at Normal (mission 72). */
export const MONTH_PANEL_SIDE_REM = 21;

/** A Week column's least comfortable width and the hour rail beside it, both px: the least the view must keep for the panel to sit beside it (mission 72). */
const BESIDE_VIEW_MIN_PX = 7 * 49 + 48;

/**
 * Whether the month panel sits beside the view (a left column) instead of
 * above it. Decided in JavaScript, not by a bare container query, because
 * the panel's width is in rem (it follows Text size) while the body's width
 * is real pixels: the panel goes beside only on a view with columns
 * (`canBeside`), only once the body is `MONTH_PANEL_BESIDE_MIN_PX` wide, and
 * only if the view keeps room for seven columns after the panel takes its
 * width at the live root font size `rootPx` (mission 72).
 */
export function monthPanelBeside(canBeside: boolean, widthPx: number, rootPx: number): boolean {
  if (!canBeside || widthPx < MONTH_PANEL_BESIDE_MIN_PX) return false;
  return widthPx - MONTH_PANEL_SIDE_REM * rootPx >= BESIDE_VIEW_MIN_PX;
}

/**
 * The body width the panel's "beside" decision should use. A pinned Sidebar
 * (`navPx` 256) is squeezed to the rail (`railPx` 72) the moment the panel
 * goes beside, which hands its difference to the body; deciding on the
 * measured width alone would never go beside on a landscape iPad above
 * Normal text. Once beside, `navPx` is already the rail's, so nothing is
 * added and the decision cannot flip (mission 72). A missing or odd `navPx`
 * (no pinned menu, below `lg`) adds nothing.
 */
export function widthWithRailNav(widthPx: number, navPx: number, railPx: number): number {
  return Number.isFinite(navPx) && navPx > railPx ? widthPx + (navPx - railPx) : widthPx;
}

/** The month panel and the view side by side (mission 72). Changes together with the strings below. */
export const MONTH_PANEL_ROW_CLASSES = "flex items-start";

/** The panel beside the view: a left column of 21rem with a line between, as tall as its own content so it can stick (mission 72). */
export const MONTH_PANEL_SIDE_CLASSES = "w-[21rem] shrink-0 self-start border-r border-line pr-4";

/** The panel above the view (phone, and Month and Year at any width): the line under it runs edge to edge like the calendar below, while its own content keeps `<main>`'s 1rem (mission 72). */
export const MONTH_PANEL_STACKED_CLASSES = `${PAGE_BLEED_CLASSES} mb-4 border-b border-line px-4`;

/** On Schedule the panel sticks under the pinned bar; opaque and above the list, below the sheets (mission 72). */
export const MONTH_PANEL_STICKY_CLASSES = "sticky z-10 bg-bg";

/** The view beside the panel: takes the rest of the row, and its 1rem left padding cancels the timeline's edge-to-edge bleed so the hour rail starts at the panel's line (mission 72). */
export const MONTH_PANEL_BESIDE_VIEW_CLASSES = "min-w-0 flex-1 pl-4";
