// Calendar-safe date helpers for the Meal Plan feature.
//
// Two rules, and breaking either one produces a real, silent, hard-to-catch
// bug — not a hypothetical one:
//
// 1. NEVER do date math with milliseconds (`+ 7 * 24 * 3600 * 1000` etc).
//    A week is 167 or 169 hours, not always 168, across a daylight-saving
//    change — US clocks fall back Nov 1, 2026, squarely inside this
//    feature's first months. Every function here moves calendar
//    components (year/month/day) instead, the same discipline the
//    leftovers days-good picker already established for `expiresAt`.
//
// 2. NEVER decide "what day is today" or "which Sunday is this" on the
//    server. This project's dev machine runs America/Denver (Mountain);
//    Vercel's production runtime runs UTC. Mountain is *behind* UTC, so a
//    Date built from calendar components on a UTC server represents an
//    instant that reads back as the PREVIOUS calendar day once a Mountain
//    browser interprets it locally — a real off-by-one-day bug, not a
//    theoretical one. Calendar-meaningful dates (a new plan's `weekStart`,
//    "today" for highlighting) must always be constructed in the browser,
//    from the device's own clock. The server's job is limited to storing
//    and adding day-offsets to whatever Date the browser already decided
//    on — never reconstructing one from scratch. These helpers are safe to
//    call from either side (they're pure arithmetic on whatever Date
//    they're given), but the *decision* of which real-world day a Date
//    represents belongs to client code only.

/** Midnight, local time, on the same calendar day as `date`. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Adds `days` calendar days to `date`. Safe across a DST change because it
 * moves the day-of-month, never the clock — the day this lands on always
 * has a real midnight, even on the two days a year that don't have exactly
 * 24 hours. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Midnight, local time, on the Sunday of the week containing `date`. */
export function sundayOf(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay());
}

/** True when `a` and `b` fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/** "Sun", "Mon", ... — the short weekday vocabulary, exported (unlike
 * DAY_NAMES above) because the Calendar branch's day gutter needs it too;
 * see mission-8's Captain finding that DaySection.tsx had started a second,
 * private copy of this exact list, which K2's Month header would otherwise
 * have copied a third time. */
export const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Aug 9–15" for a week that stays in one month, "Jul 27 – Aug 2" for one
 * that crosses a month boundary. */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const startMonth = MONTH_NAMES[weekStart.getMonth()];
  const endMonth = MONTH_NAMES[end.getMonth()];
  return startMonth === endMonth
    ? `${startMonth} ${weekStart.getDate()}–${end.getDate()}`
    : `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}`;
}

/** "Sunday, Aug 9" — a day card's header. */
export function formatDayLabel(date: Date): string {
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

/** Local "YYYY-MM-DD" — the one shared answer to a job that had grown
 * several private copies (CalendarViews.tsx's `toDateParam`, EventForm.tsx's
 * `toDateInputValue`, PantryItemEditSheet.tsx's own copy; see mission-9's
 * Captain finding). Never `date.toISOString()` for this: that renders in
 * UTC, which silently rolls an evening local date back a day on this
 * household's Mountain clock — the same trap rule 2 above exists to avoid,
 * just at the string-formatting layer instead of the date-math layer. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when `a` and `b` fall in the same calendar month (and year — two
 * Novembers a year apart are NOT the same month). Added for mission-9's
 * Month view (K2/C2a): the grid highlights the current month's own days
 * differently from adjacent-month filler, and this is the one-line
 * comparison that decision needs. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** The full month name, e.g. "September" — deliberately a SEPARATE list
 * from `MONTH_NAMES` above, not a substring/lookup trick against it: that
 * list is abbreviated ("Sep") for the Week view's compact range label, and
 * Month's own title ("September 2026") needs the unabbreviated word. Added
 * for mission-9 Month view (K2/C2a); see that mission's Captain finding
 * that no full-month vocabulary existed anywhere in this repo before this. */
const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** "September 2026" — the Month view's title. */
export function formatMonthTitle(date: Date): string {
  return `${FULL_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}
