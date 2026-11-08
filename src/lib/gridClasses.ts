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
