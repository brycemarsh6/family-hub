"use client";

// The hour timeline — Day / 3 Day / Week's real renderer (mission-17, CV4,
// contract C2). Nothing in src/ has positioned anything by TIME before this;
// every other calendar view (DaySection's agenda list, MonthGrid's pills) is
// a plain vertical list. This component turns `src/lib/timelineLayout.ts`
// (CV2's pure minutes-only geometry, unconsumed until now — see that file's
// own header) into pixels: a 24-row wall-clock rail, overlapping events side
// by side, an all-day strip above, and a live now-line.
//
// DEPENDENCY INJECTION, not internal hooks, for everything the CALLER
// already knows (mission-17/C1's own rider names the precedent:
// ScheduleFetchers, useScheduleMonthTitle's offset argument). Three
// consequences:
//   - `today`/`now` arrive as plain, already-resolved `Date`s — same
//     convention MonthGrid.tsx/DaySection.tsx's resolved branch already use
//     (their `today: Date`, never `Date | null`): the CALLER is what guards
//     `today === null` (useToday() hasn't resolved yet) and only mounts this
//     component once both are real, exactly like CalendarViews.tsx already
//     does for MonthGrid ("today !== null && anchor !== null && <MonthGrid
//     ...>"). `now` follows the identical shape via the new useNowMinute.ts
//     hook (this contract also ships), which this component deliberately
//     does NOT call itself — see that file's own header for why.
//   - `chromeOffsetPx`: mission-17/C1 is relocating APP_HEADER_HEIGHT_PX
//     into src/lib/appChrome.ts AT THE SAME TIME this file is being
//     written, in a separate worktree — importing it here would be
//     importing a file mid-edit by a parallel builder. This component
//     therefore takes the app header's height as a prop instead, exactly
//     the shape RecipeList.tsx already uses for the same constant (that
//     file "explicitly refuses to import a calendar component" for it).
//     It's used ONLY as the first-paint seed for the scroller's height (see
//     the sizing effect below) — the same "seed value now, refine with a
//     real measurement after mount" split C1's own contract documents for
//     APP_HEADER_HEIGHT_PX itself.
//   - The bottom nav's height is measured live at runtime, never hardcoded —
//     see the sizing effect's own comment for why a live DOM measurement is
//     kept here rather than switching to appChrome.ts's `useBottomNavHeight`
//     hook. Its FALLBACK value (for the rare case the nav element isn't
//     found at all) is `BOTTOM_NAV_HEIGHT_PX` (appChrome.ts, mission-17/C5)
//     rather than a private guess — this file used to carry its own `64`,
//     which Captain found was WRONG (65 is the real number: HubNav.tsx's
//     `min-h-16` row PLUS its own `border-t`), the exact "must-not-touch
//     boundary satisfied by copying" failure this mission's own report
//     names, one level down from `hexToRgba`'s original hoist.
//
// CONSUMES timelineLayout.ts's `partitionForTimeline`/`blockGeometry`/
// `assignColumns` UNCHANGED, and feeds the all-day strip to the EXISTING
// `monthLayout.assignLanes` — no second packer (D4). `TimelineEvent` and
// `MonthLayoutEvent` are structurally identical `{id, startAt, endAt,
// allDay}` shapes for exactly this reason, so the all-day row's events pass
// straight through with no conversion step; see the composition test in
// timelineLayoutPacking.test.ts, which mission-12/Captain flagged as
// load-bearing STRUCTURE, not incidental coverage — do not delete it just
// because this is now a real call site.
//
// mission-17/C5 adds TASKS to the all-day strip alongside events — Fury's
// original C2 contract enumerated this component's props and left `tasks`
// out entirely, which made a chore due today invisible on the very view the
// app opens to (Day/3 Day/Week), even though Month and Schedule both
// already rendered it. Reshaped into the SAME `{id, startAt, endAt: +1 day,
// allDay: true}` layout shape as an event — MonthGrid.tsx's own
// `taskAsMonthEvent` does the identical reshape for Month's row, for the
// identical D1/D4 "no second packer" reason — and fed into the SAME
// `assignLanes` call as `allDayRow`, not a second one. `taskById` is kept
// SEPARATE from `eventById` (never merged into one map) so a task id can
// never be mistaken for an event id even though the two id spaces can't
// actually collide (separate cuid-keyed tables) — checked first in the
// render loop below, which makes that ordering the real safeguard rather
// than the separate maps alone.
//
// The all-day strip's "+N more" is a REAL `<button>` now, not an inert
// `<span>` — Strange traced the old dead end as CIRCULAR: Month's own "+N
// more" navigates to Day, which rendered the identical dead "+N more",
// terminating an affordance whose entire justification is "tap through to
// see them all." Tapping it EXPANDS the strip to every lane
// (`monthLayout.assignLanes`'s new optional `visibleLanes` argument, see
// that function's own comment) rather than navigating somewhere that can't
// show them either.
//
// STRUCTURE.md HARD-CAP DISCLOSURE (mission-17/C5): this file now reads
// roughly 805 total lines / 345 lines of actual code (stripped of comments
// and blanks) — a deliberately approximate TOTAL figure, since this
// disclosure paragraph is itself part of what's being counted, and editing
// it to cite an exact number changes that number by a line or two. The
// CODE figure is stable and exact, and is the one this rule cares about
// most: total is over the 650-line hard cap, but code alone is still well
// under it (the same "report both counts, a file whose non-comment code is
// well under the cap is not a split candidate" rule STRUCTURE.md already
// applies to useScheduleWindow.ts). Captain named the all-day strip as this
// file's own seam BEFORE this contract ran ("63 lines for 4 props,"
// mission-17's own report) with **CD1** (a later, dedicated mission) as the
// trip condition for actually extracting it into its own component — this
// contract's boundary does not include creating a new file, so five more
// all-day-strip features (tasks, the not-loaded banner, the real "+N more"
// button, the 24px raise, the task/event branch) landed here instead,
// pushing total lines up by roughly 285 from C2's own reported 519 in one
// pass. Flagged here in writing, per the hard-cap rule, rather than
// silently crossing it — CD1 remains the right place to actually split
// this file, not this one.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarOff } from "lucide-react";
import {
  MINUTES_PER_DAY,
  MIN_BLOCK_MINUTES,
  minutesOfDay,
  blockGeometry,
  partitionForTimeline,
  assignColumns,
  type TimelineEvent,
  type TimelineColumnSlot,
  type TimelineBlock,
} from "@/lib/timelineLayout";
import { assignLanes, type MonthLayoutEvent } from "@/lib/monthLayout";
import { addDays, isSameDay, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import {
  allDayInstantToLocalDay,
  daysEventCovers,
  formatTimeRange,
  isOutsideWindow,
  isPast,
  localDayToAllDayInstant,
} from "@/lib/calendarDates";
import { avatarColorHex } from "@/lib/constants";
import { bandedBackground } from "@/lib/color";
import { BOTTOM_NAV_HEIGHT_PX } from "@/lib/appChrome";
import type { CalendarEventView, CalendarTaskView } from "@/lib/types";

/** The rail's own scale — CSS custom property `--hour-height`, per the
 * contract, so nothing else in this file's markup repeats the raw number.
 * 48px/hour means a MIN_BLOCK_MINUTES (30 min, timelineLayout.ts) block
 * draws 24px tall — see the block-rendering section below for why that's a
 * disclosed, reasoned exception to the 44px floor rather than a miss. */
const HOUR_HEIGHT_PX = 48;
const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
/** Tied to timelineLayout.ts's own MINUTES_PER_DAY (D2's "always 1440
 * rail minutes" invariant) rather than a bare 24, so a change to that
 * constant could never silently disagree with how many rows this file
 * draws. */
const HOURS_PER_DAY = MINUTES_PER_DAY / 60;
const GUTTER_WIDTH_PX = 48;

const MIN_SCROLLER_HEIGHT_PX = 320;

/** Hour gutter labels ("12 AM", "1 AM", ... "11 PM") via `Intl`, computed
 * once at module load against a fixed, deliberately non-transition date
 * (Jan 1 — nowhere near either US DST boundary) purely as a vehicle to get
 * `Intl.DateTimeFormat` to spell out a given HOUR NUMBER, never rendered or
 * compared as a real calendar day. */
const HOUR_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true });
const HOUR_LABELS = Array.from({ length: HOURS_PER_DAY }, (_, hour) =>
  HOUR_LABEL_FORMATTER.format(new Date(2000, 0, 1, hour, 0)),
);

// Up to 3 diagonal bands (Month's own cap, EventCard.tsx's own comment for
// why THIS pill is capped tighter than EventCard's uncapped list version) —
// `bandedBackground` (src/lib/color.ts) used to be a private copy in this
// file named `blockBackground`, under a comment claiming it was "a private,
// minimal variant, not a copy." That claim was WRONG — Fury diffed it
// against MonthCell.tsx's own `pillBackground` and found the two
// byte-for-byte identical, only reachable because mission-17's C2/C3
// contracts put the two files in DIFFERENT boundaries, neither allowed to
// touch the other's. mission-17/C5 hoisted it; see color.ts's own header
// for the fuller reasoning and why EventCard.tsx's `bandBackground` stays a
// genuinely separate function. `alpha`/opaque `var(--surface)` backdrop and
// the two alpha values used below (0.10 live / 0.05 past-or-done) are
// EventCard's own already-measured numbers (mission-8/Strange: worst case
// 4.64:1 light / 5.53:1 dark across all 8 AVATAR_COLORS) — reusing the
// identical inputs is what makes reusing that finding valid here too, with
// no new contrast pass needed.

type TimelineGridProps = {
  /** `[anchor]` (Day) / `[anchor, +1, +2]` (3 Day, anchor-relative, never
   * snapped — Google's own behaviour) / the 7 days of `sundayOf(anchor)`
   * (Week). The CALLER (mission-17/C4) decides which; this component only
   * ever renders however many columns it's handed. */
  columnDays: Date[];
  events: CalendarEventView[];
  /** mission-17/C5 — tasks due within the fetched window, the SAME shape
   * MonthGrid.tsx and DaySection.tsx already receive (CalendarViews.tsx
   * passes its one `tasks` prop through unfiltered to all three — this
   * component decides which ones touch `columnDays` itself, via
   * `assignLanes`, exactly like Month already does for its own rows). See
   * this file's own header for why these land in the all-day strip rather
   * than a second rendering path. */
  tasks: CalendarTaskView[];
  /** Both real, resolved `Date`s — see this file's own header for why
   * neither is `| null` here, unlike the `useToday()`/`useNowMinute()`
   * hooks that produce them. */
  today: Date;
  now: Date;
  /** page.tsx's fetch bounds — drives the SAME `isOutsideWindow` check
   * MonthCell/DaySection already use, applied per column in the all-day
   * strip (see that section below), per MonthCell's own not-loaded policy:
   * three states (loading, empty, outside-window), never two. */
  windowStart: Date;
  windowEnd: Date;
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  /** Opens the task detail sheet for one task — same shape as
   * DaySection.tsx's own `onOpenTask` (`day` threaded through for the same
   * symmetry-with-onOpenEvent reason that file's own comment gives, even
   * though a task has exactly one due date and CalendarViews.tsx's actual
   * handler ignores it), so the same closure the daySection branch already
   * passes for `year` can be reused here unchanged. */
  onOpenTask: (task: CalendarTaskView, day: Date) => void;
  /** The app's global sticky header's rendered height — see this file's own
   * header for why this is a prop rather than an import of
   * APP_HEADER_HEIGHT_PX. Used only as the scroller's first-paint height
   * seed (a CSS `calc()` string, safe under SSR); a real measurement
   * refines it the instant this mounts. */
  chromeOffsetPx: number;
};

/** One event's shape as the pure layout library needs it — see
 * timelineLayout.ts's own `TimelineEvent` doc comment for why this is
 * deliberately narrower than `CalendarEventView`. */
function toTimelineEvent(event: CalendarEventView): TimelineEvent {
  return { id: event.id, startAt: event.startAt, endAt: event.endAt, allDay: event.allDay };
}

export function TimelineGrid({
  columnDays,
  events,
  tasks,
  today,
  now,
  windowStart,
  windowEnd,
  onOpenEvent,
  onOpenTask,
  chromeOffsetPx,
}: TimelineGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnDaysKey = columnDays.map((day) => day.getTime()).join(",");

  // --- Sizing: this component's own overflow-y-auto scroller, sized from
  // the measured header + nav (the contract's own words), not a computed
  // guess. `chromeOffsetPx` seeds the CSS `calc()` used for the very first
  // paint (and SSR, since a client component still renders once on the
  // server for its initial HTML) — cheap and correct because a `height`
  // isn't a pinned `style={{ top }}`; a one-paint-late refinement here reads
  // as the box settling, not as content jumping under a fixed point (see
  // mission-16/C1's own rider comment for the general "fine for scroll-mt,
  // not fine for a pinned top" distinction this borrows).
  //
  // The bottom nav's real height is MEASURED live at runtime, deliberately
  // not read from a hook (`useBottomNavHeight`, appChrome.ts) — see below
  // for why. STRUCTURE.md's chrome-dimension rule treats a runtime
  // measurement as an equal-standing alternative to a shared constant, and
  // this effect's own live DOM query IS that measurement; only its
  // FALLBACK value (`BOTTOM_NAV_HEIGHT_PX`, for the rare case the nav
  // element isn't found at all) now comes from appChrome.ts rather than a
  // private guess — mission-17/C5, after Captain found this file's own
  // previous fallback (`64`) was wrong (the real number is 65: HubNav.tsx's
  // `min-h-16` row plus its own `border-t`). `aria-label` selector, not a
  // class, because HubNav.tsx's own `aria-label="Sections"` is already the
  // one stable, accessibility-driven hook on that element; nothing here
  // depends on its CSS classes.
  //
  // Why not just call `useBottomNavHeight()` here instead of this inline
  // query: that hook's return value is REACT STATE, one render/commit
  // behind the live DOM at the instant this effect runs — and the
  // scroll-to-now effect right below this one reads `scroller.clientHeight`
  // in the SAME synchronous commit as the imperative `style.height` write
  // below, which a hook's state value can't feed (see that write's own
  // comment for why the imperative step exists at all). A hook is the right
  // shape for a consumer that only needs the NUMBER; this effect needs the
  // measurement and an imperative write in the same pass, so it keeps its
  // own query and only borrows the shared fallback constant.
  const [measuredHeightPx, setMeasuredHeightPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function measure() {
      const top = scroller!.getBoundingClientRect().top;
      const nav = document.querySelector('nav[aria-label="Sections"]');
      const navHeightPx = nav?.getBoundingClientRect().height ?? BOTTOM_NAV_HEIGHT_PX;
      const available = Math.max(window.innerHeight - top - navHeightPx, MIN_SCROLLER_HEIGHT_PX);
      setMeasuredHeightPx(available);
      // Applied imperatively, in addition to the React state update above,
      // for a real reason and not a redundant belt-and-suspenders: the
      // scroll-to-now effect below runs in the SAME commit, immediately
      // after this one, and reads `scroller.clientHeight` — a React state
      // update doesn't reach the DOM until the NEXT render/commit, which is
      // too late for that read. Mutating `style.height` here directly means
      // the very next `getBoundingClientRect()`/`clientHeight` read in this
      // same synchronous pass already reflects the real measured height,
      // not the previous render's `calc()` first-paint seed. (Caught by
      // measuring, not assumed: without this line, the scroll-to-now target
      // was computed against the calc() fallback's clientHeight — visibly
      // wrong on a real device, where the fallback overshoots the true
      // available height.)
      scroller!.style.height = `${available}px`;
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // Re-measures on every column-set change too (a view switch), not just
    // on mount: cheap, and correct if the chrome above this component ever
    // renders at a different height for a different view (it doesn't
    // today, but nothing here should assume that stays true forever).
  }, [columnDaysKey]);

  const scrollerHeightStyle =
    measuredHeightPx !== null
      ? `${measuredHeightPx}px`
      : `calc(100dvh - ${chromeOffsetPx + BOTTOM_NAV_HEIGHT_PX}px)`;

  // --- Scroll-to-now on open (or 7 AM when today isn't one of the columns).
  // Keyed ONLY on the column set, deliberately excluding `today`/`now` from
  // the dependency array (both are read fresh inside, via the ref, each
  // time this DOES run) — including `now` would re-run this every 60s tick
  // (useNowMinute.ts's own poll interval) and yank the reader's scroll
  // position back to "now" while they're trying to read something earlier
  // or later in the day, which is not what "scroll to now ON OPEN" means.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const todayIndex = columnDays.findIndex((day) => isSameDay(day, today));
    const targetTopPx =
      todayIndex === -1
        ? 7 * 60 * PX_PER_MINUTE
        : Math.max(0, minutesOfDay(now) * PX_PER_MINUTE - scroller.clientHeight / 3);
    scroller.scrollTop = targetTopPx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnDaysKey]);

  // --- Layout: partitionForTimeline (CV2, unchanged) splits into the
  // all-day row and the timed set; the all-day row is THEN fed to the
  // EXISTING monthLayout.assignLanes (D4) — no second packer.
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const { allDayRow, timed } = useMemo(
    () => partitionForTimeline(columnDays, events.map(toTimelineEvent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnDaysKey, events],
  );

  // mission-17/C5 — tasks join the all-day row, reshaped into the same
  // `{id, startAt, endAt, allDay: true}` layout shape MonthGrid.tsx's own
  // `taskAsMonthEvent` already builds for Month's identical row (D1/D4: no
  // second packer, no second reshape convention either). `startAt` is
  // `task.dueDate` directly — that field IS already the due day's
  // UTC-midnight "all-day instant" (Task.dueDate's own schema comment), so
  // no re-derivation is needed there; `endAt` is the day AFTER's own
  // midnight instant, the same EXCLUSIVE end every other all-day span in
  // this app uses (`daysEventCovers`/`eventDaySpan` both expect it). Kept in
  // a SEPARATE map (`taskById`) from `eventById`, checked FIRST in the
  // render loop below, so a task id is never even looked up against
  // `eventById` — belt-and-braces on top of the fact that the two id spaces
  // can't actually collide (separate cuid-keyed tables).
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const taskLayoutEvents: MonthLayoutEvent[] = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        startAt: task.dueDate,
        endAt: localDayToAllDayInstant(addDays(allDayInstantToLocalDay(task.dueDate), 1)),
        allDay: true,
      })),
    [tasks],
  );
  const allDayItems = useMemo(
    () => [...allDayRow, ...taskLayoutEvents],
    [allDayRow, taskLayoutEvents],
  );

  // "+N more" used to be a dead end (see this file's own header) — tapping
  // it now expands the strip to every lane instead of capping at 3, via
  // `assignLanes`'s own `visibleLanes` argument (monthLayout.ts). Reset
  // whenever the column set changes (paging to a new day/week) so a family
  // member who expanded Tuesday doesn't find Wednesday pre-expanded too.
  //
  // Reset by ADJUSTING STATE DURING RENDER (React's own documented pattern
  // for "reset some state when a prop changes"), not inside a `useEffect` —
  // an effect body calling `setState` unconditionally on every dependency
  // change is exactly what `react-hooks/set-state-in-effect` exists to
  // flag: it costs an extra commit-then-recommit render cycle whenever the
  // reset actually needs to fire. Keying the stored flag to the column set
  // it was computed for means a stale flag from the PREVIOUS column set is
  // detected and corrected in the same render pass, before anything paints.
  const [allDayExpandedFor, setAllDayExpandedFor] = useState({
    key: columnDaysKey,
    expanded: false,
  });
  if (allDayExpandedFor.key !== columnDaysKey) {
    setAllDayExpandedFor({ key: columnDaysKey, expanded: false });
  }
  const allDayExpanded = allDayExpandedFor.key === columnDaysKey && allDayExpandedFor.expanded;
  function expandAllDay() {
    setAllDayExpandedFor({ key: columnDaysKey, expanded: true });
  }

  const { spans: allDaySpans, overflowByDay } = useMemo(
    () => assignLanes(columnDays, allDayItems, allDayExpanded ? Number.POSITIVE_INFINITY : undefined),
    [columnDays, allDayItems, allDayExpanded],
  );
  const maxAllDayLane = allDaySpans.reduce((max, span) => Math.max(max, span.lane), -1);

  // mission-17/C5 — Strange reached the state where a Day/3 Day/Week
  // column's window coverage was fully out of the fetched range and found
  // the accessible text byte-identical to a genuinely-empty day, since the
  // only differentiator was a 9x9px `aria-hidden` glyph. `outsideColumns`
  // and `allColumnsOutside` below are what let the render body below show
  // DaySection's own WORDED not-loaded card in that case — see that
  // section's own comment for the full reasoning, including why a single
  // shared banner correctly covers BOTH "Day as a card in the column body"
  // and "3 Day/Week as a single strip" (Day has exactly one column, so the
  // two descriptions collapse to the identical element).
  const outsideColumns = columnDays.map((day) => isOutsideWindow(day, windowStart, windowEnd));
  const allColumnsOutside = outsideColumns.length > 0 && outsideColumns.every(Boolean);

  // One `assignColumns` call PER COLUMN (never once for the whole set) —
  // each day's timed blocks are laid out independently, which is what lets
  // a Fri 10 PM -> Sat 2 AM event draw a clipped block on BOTH days without
  // the two clipped halves fighting over one shared column assignment.
  const columnSlots: TimelineColumnSlot<TimelineBlock>[][] = columnDays.map((day) => {
    const blocks: TimelineBlock[] = [];
    for (const event of timed) {
      const geometry = blockGeometry(day, event);
      if (geometry) {
        blocks.push({ id: event.id, topMinutes: geometry.topMinutes, heightMinutes: geometry.heightMinutes });
      }
    }
    return assignColumns(blocks);
  });

  const gridTemplateColumns = `${GUTTER_WIDTH_PX}px repeat(${columnDays.length}, minmax(0, 1fr))`;
  const compact = columnDays.length > 1; // 3 Day / Week — Day view (1 column) gets more detail (D5).
  const dayBeforeSet = addDays(columnDays[0], -1);
  const dayAfterSet = addDays(columnDays[columnDays.length - 1], 1);

  return (
    <div
      className="overflow-hidden rounded-xl border border-line"
      style={{ ["--hour-height" as string]: `${HOUR_HEIGHT_PX}px` }}
    >
      <div ref={scrollerRef} className="overflow-y-auto" style={{ height: scrollerHeightStyle }}>
        {/* Sticky as ONE unit — the weekday header and the all-day strip
            stack inside it via ordinary flow, so there's no second `top`
            offset to compute or keep in sync with the first (a smaller,
            local version of the exact problem STRUCTURE.md's chrome-
            dimension rule exists for, avoided here by never splitting this
            into two independently-positioned sticky elements). Containing
            block for `sticky` here is `scrollerRef`'s own div — the nested
            overflow-y-auto element — genuinely a scroll container
            regardless of html/body's own overflow status (mission-16/C4's
            fix was about the DOCUMENT's scroller; this one is deliberate
            and local, so it was never affected either way). */}
        <div className="sticky top-0 z-20 border-b border-line bg-bg">
          <div className="grid py-1" style={{ gridTemplateColumns }}>
            <span aria-hidden="true" />
            {columnDays.map((day) => {
              const isToday = isSameDay(day, today);
              const notLoaded = isOutsideWindow(day, windowStart, windowEnd);
              return (
                <div key={day.getTime()} className="flex flex-col items-center gap-0.5 px-0.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-accent" : "text-muted"}`}>
                    {SHORT_DAY_NAMES[day.getDay()]}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? "bg-accent text-accent-fg" : "text-fg"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {/* Per-column not-loaded glyph — MonthCell's own policy
                        (small, muted, next to the day number), applied here
                        rather than inside the all-day lanes below: a day
                        with zero all-day events still needs somewhere to
                        say "not fully fetched," and the header cell is
                        where MonthCell puts the identical fact. */}
                    {notLoaded && <CalendarOff aria-hidden="true" size={9} className="shrink-0 text-muted" />}
                  </span>
                </div>
              );
            })}
          </div>

          {/* All-day strip — CSS grid so a spanning bar is one element
              placed by gridColumn/gridRow, not N per-column copies. Only
              rendered with real height when there's something to show
              (mission-8/K2's own "an empty state must not claim space a
              real one would" discipline) — an empty grid with zero rows
              collapses to nothing, exactly like Month's own "+N more" line
              only appearing when overflow > 0. */}
          {maxAllDayLane >= 0 && (
            <div
              className="grid gap-0.5 px-1 pb-1"
              // mission-17/C5: raised from 18px to 24px, matching the timed
              // grid's own MIN_BLOCK_MINUTES floor — Strange's ruling on the
              // 24px timed block explicitly does NOT cover this row too: a
              // timed block's 24px is defended by its real duration
              // (MIN_BLOCK_MINUTES x HOUR_HEIGHT_PX), and this bar has no
              // duration to be faithful to at all — `18px` was a free
              // constant, not arithmetic, so it gets no such defense and is
              // raised to match rather than kept shorter for no reason.
              style={{ gridTemplateColumns, gridAutoRows: "24px" }}
            >
              <span aria-hidden="true" />
              {allDaySpans.map((span) => {
                // mission-17/C5 — tasks first, and ONLY against `taskById`:
                // see this file's own header for why a task id is never
                // even looked up against `eventById`.
                const task = taskById.get(span.event.id);
                if (task) {
                  const completed = task.completedAt !== null;
                  const colors = task.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
                  // A task is always single-day (CalendarTaskView's own
                  // comment: "exactly one due date, never a span"), so
                  // unlike an event bar it never has an open/continuing
                  // edge to draw — always fully rounded on both sides.
                  return (
                    <button
                      key={span.event.id}
                      type="button"
                      onClick={() => onOpenTask(task, columnDays[span.startCol])}
                      // `line-through` (a purely visual text-decoration) is
                      // not announced by assistive tech, so "completed" is
                      // also said in words here via aria-label — the same
                      // reasoning TaskCard.tsx's own aria-label already
                      // documents for the identical fact.
                      aria-label={completed ? `${task.title}, completed` : task.title}
                      className={`truncate rounded border px-1 text-left text-[9px] font-semibold leading-[24px] ${
                        completed ? "border-muted text-muted" : "border-fg text-fg"
                      }`}
                      style={{
                        gridColumn: `${span.startCol + 2} / ${span.endCol + 3}`,
                        gridRow: span.lane + 1,
                        background: bandedBackground(colors, completed ? 0.05 : 0.1),
                      }}
                    >
                      {/* MonthCell.tsx's own open/completed checkbox glyph
                          vocabulary (✓ / ☐) — see that component's own
                          comment for the full reasoning on why a glyph
                          exists at all. Paired with `line-through` on the
                          title HERE, unlike MonthCell: this strip's title is
                          a real visible string at every width this file
                          renders (never `sr-only` below `md` the way
                          MonthCell's phone-width pill is), so the reason
                          MonthCell reaches for a glyph INSTEAD of
                          `line-through` — its title is invisible below `md`
                          — doesn't apply here, and both can carry the
                          "done" fact together. No `past`-based dimming
                          (unlike an event bar, and unlike MonthCell's own
                          task handling): TaskCard.tsx's own rule is "only
                          completedAt changes how this renders," and that is
                          the one this new code follows directly rather than
                          replicating MonthCell's separate `past` check. */}
                      <span aria-hidden="true">{completed ? "✓ " : "☐ "}</span>
                      <span className={completed ? "line-through" : ""}>{task.title}</span>
                    </button>
                  );
                }

                const event = eventById.get(span.event.id);
                if (!event) return null; // defensive; every span's id came from `events`/`tasks`
                const continuesBefore =
                  daysEventCovers(event.startAt, event.endAt, event.allDay, [dayBeforeSet]).length > 0;
                const continuesAfter =
                  daysEventCovers(event.startAt, event.endAt, event.allDay, [dayAfterSet]).length > 0;
                const colors = event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
                // The representative day for this bar's tap target — the
                // first column it actually touches in THIS render, not
                // necessarily the event's true start (a bar continuing from
                // before `columnDays[0]` still needs a real day to open the
                // detail sheet against).
                const representativeDay = columnDays[span.startCol];
                return (
                  <button
                    key={span.event.id}
                    type="button"
                    onClick={() => onOpenEvent(event, representativeDay)}
                    className={`truncate border-y px-1 text-left text-[9px] font-semibold leading-[24px] text-fg border-fg ${
                      continuesBefore ? "" : "rounded-l border-l"
                    } ${continuesAfter ? "" : "rounded-r border-r"}`}
                    style={{
                      gridColumn: `${span.startCol + 2} / ${span.endCol + 3}`,
                      gridRow: span.lane + 1,
                      background: bandedBackground(colors, 0.1),
                    }}
                  >
                    {event.title}
                  </button>
                );
              })}
              {columnDays.map((day, col) =>
                overflowByDay[col] > 0 ? (
                  // A real BUTTON now, not an inert `<span>` — see this
                  // file's own header for why the old version was a
                  // circular dead end. `whitespace-nowrap` (Strange's
                  // finding): at 320px this text wrapped to two lines,
                  // measured with `Range.getClientRects` (a bounding-box
                  // probe reported it clean and was wrong) — 9px of ink
                  // escaped the 24px row onto the scrolling rail below.
                  <button
                    key={`overflow-${day.getTime()}`}
                    type="button"
                    onClick={expandAllDay}
                    className="whitespace-nowrap text-left text-[9px] leading-[24px] text-muted underline decoration-dotted"
                    style={{ gridColumn: col + 2, gridRow: maxAllDayLane + 2 }}
                  >
                    +{overflowByDay[col]} more
                  </button>
                ) : null,
              )}
            </div>
          )}

          {/* mission-17/C5 — Strange reached the state (2000ms injected
              latency + 14 rapid Next taps) where every column here was
              fully outside the fetched window, and found the accessible
              text byte-identical to a genuinely-empty day apart from the
              dates — the only differentiator was a 9x9px `aria-hidden`
              glyph next to each day number above. DaySection.tsx's own
              `NotLoadedCard` already solves this with WORDED text
              (`ScheduleView` still renders it, proving the treatment is
              affordable); that component is private to DaySection.tsx and
              off this contract's boundary, so its markup is reproduced
              verbatim here rather than imported. Rendered only when EVERY
              column is out of window — the realistic case, since the fetch
              window moves as one block — leaving the per-column glyph above
              as the only signal for a MIXED window (only possible in 3 Day/
              Week, never Day, which has exactly one column and so is never
              "mixed"). That single-column case is also why one shared
              element correctly satisfies BOTH "Day as a card in the column
              body" and "3 Day/Week as a single strip": with one column, a
              full-width strip IS the column's own body. */}
          {allColumnsOutside && (
            <div className="m-2 flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-sm text-muted">
              <CalendarOff aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <span>
                Not all events loaded
                <span className="mt-0.5 block text-xs">
                  Marshee shows about two months each way — tap Today to come back.
                </span>
              </span>
            </div>
          )}
        </div>

        {/* The hour rail: a gutter of 24 labels, then one relatively-
            positioned column per day holding gridlines, the now-line (only
            in today's own column, if present), and every timed block. */}
        <div
            className="relative grid"
            style={{ gridTemplateColumns, height: `calc(var(--hour-height) * ${HOURS_PER_DAY})` }}
          >
          <div className="relative">
            {HOUR_LABELS.map((label, hour) => (
              <span
                key={hour}
                aria-hidden="true"
                className="absolute right-1 -translate-y-1/2 text-[10px] text-muted"
                style={{ top: `calc(var(--hour-height) * ${hour})` }}
              >
                {hour === 0 ? "" : label}
              </span>
            ))}
          </div>

          {columnDays.map((day, columnIndex) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.getTime()} className="relative border-l border-line">
                {Array.from({ length: HOURS_PER_DAY }, (_, hour) => (
                  <div
                    key={hour}
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-line/60"
                    style={{ top: `calc(var(--hour-height) * ${hour})` }}
                  />
                ))}

                {columnSlots[columnIndex].map((slot) => {
                  const event = eventById.get(slot.block.id);
                  if (!event) return null; // defensive; every block came from `timed`/`eventById`
                  const past = isPast(event.endAt, now); // real "now", not day-granular `today` — see below
                  const colors = event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
                  // The library's own padded geometry — used for "is there
                  // room for a second/third line" thresholds below, which
                  // care about the box's real computed size, not the 2px
                  // cosmetic trim applied only to what's actually drawn.
                  const heightPx = slot.block.heightMinutes * PX_PER_MINUTE;
                  // mission-17/C5, Strange B3: two consecutive half-hour
                  // events measured a 0.0px gap between them — each one's
                  // 24px hit band sharing an exact edge, so a ~12px aim
                  // error opens the wrong one, which is worse than missing.
                  // Drawing 2px SHORTER than the computed geometry (top
                  // unchanged) is free and needs no `timelineLayout.ts`
                  // change: `assignColumns` only guarantees non-overlap up
                  // to exactly the padded box, so shrinking what's drawn can
                  // never reintroduce an overlap the way inflating it could.
                  const drawnHeightPx = Math.max(0, heightPx - 2);
                  // The box's real duration is PADDED UP to
                  // MIN_BLOCK_MINUTES by blockGeometry (timelineLayout.ts),
                  // so a genuinely 15-minute event draws exactly like a
                  // 30-minute one — the one case where the box's height is
                  // not a fact about the event. `trueDurationMinutes` is the
                  // event's OWN unpadded span, used only to force the time
                  // line to show even when the drawn box is too short to
                  // "earn" it on the usual height-based test below — a guess
                  // (this box's height) must never stand in for a fact (how
                  // long this really is) when the two disagree.
                  const trueDurationMinutes = (event.endAt.getTime() - event.startAt.getTime()) / 60000;
                  return (
                    <button
                      key={slot.block.id}
                      type="button"
                      onClick={() => onOpenEvent(event, day)}
                      // D5 ("contrast by border, not alpha" — C7's Month-pill
                      // ruling applies here too): the fill alone (0.05/0.10
                      // alpha) measures under WCAG's 3:1 non-text floor by
                      // itself, so a solid `border-fg`/`border-muted` carries
                      // the real contrast, exactly MonthCell's own technique.
                      //
                      // 44px NOTE — Strange's ruling (mission-17, gate round
                      // 1): "accept the height, reject the abutment." At this
                      // file's HOUR_HEIGHT_PX (48), a MIN_BLOCK_MINUTES
                      // (30 min, timelineLayout.ts) block draws
                      // 30/60 * 48 = 24px tall — under DESIGN.md's 44px
                      // floor. Inflating the box past its computed geometry
                      // was rejected (it would either paint over a neighbor
                      // or reintroduce the ambiguous tap the pad exists to
                      // prevent, and doubling HOUR_HEIGHT_PX to clear 44px
                      // outright would halve the visible day from 9.2 hours
                      // to 4.6, paid on every open of the app's most-used
                      // view). The exception carries a written boundary: a
                      // timeline block's height is its duration; every block
                      // stays a real `<button>` with a real accessible name;
                      // Schedule (112px full-width rows) is the conforming
                      // route for anyone who wants one. What the ruling did
                      // NOT accept is the abutment between two such
                      // blocks — see `drawnHeightPx` above for that fix.
                      className={`absolute flex flex-col justify-start overflow-hidden rounded-md border px-1 text-left leading-tight ${
                        past ? "border-muted text-muted" : "border-fg text-fg"
                      }`}
                      style={{
                        top: `${slot.block.topMinutes * PX_PER_MINUTE}px`,
                        height: `${drawnHeightPx}px`,
                        left: `calc(${slot.column} / ${slot.columnCount} * 100%)`,
                        // 2px narrower than the raw percentage split, for the
                        // identical reason `drawnHeightPx` is 2px shorter —
                        // a real gap between two side-by-side blocks in the
                        // same overlap cluster, not just top-to-bottom ones.
                        width: `calc(100% / ${slot.columnCount} - 2px)`,
                        background: bandedBackground(colors, past ? 0.05 : 0.1),
                      }}
                    >
                      {/* `<button>` elements are vertically centered by the
                          browser's own default rendering UNLESS overridden
                          (the same reason a short `<button>`'s text never
                          looks top-aligned even with no CSS at all) — on a
                          tall block that reads as WRONG: measured live, a
                          144px 3-hour block put its title 59.7px down,
                          reading as roughly 2:30 for an event that actually
                          starts at 1:00. On an hour grid the box's TOP edge
                          IS the start time, so its content must start there
                          too. `flex flex-col justify-start` above overrides
                          the default centering; `truncate` on each span
                          still works under it since column-direction
                          flex-shrink only touches the cross axis (height)
                          here, not the width truncation depends on. */}
                      <span className={`block truncate text-[10px] font-semibold ${compact ? "" : "text-xs"}`}>
                        {event.title}
                      </span>
                      {/* Day view only (D5) — 3 Day/Week's ~44px columns get
                          a colour band with 2-3 characters, same as the
                          Month pill's own phone-width treatment; showing a
                          time/location line there would just overflow
                          illegibly. Gated on the block's own drawn height
                          too, so a 30-min Day-view block (24px) doesn't try
                          to cram two more text lines into a box shorter than
                          one already is — UNLESS the event's real duration
                          is itself under MIN_BLOCK_MINUTES, in which case the
                          height is a pad, not a fact, and the time line is
                          the only place the truth (a genuine 15-minute
                          appointment, not 30) can still be told. */}
                      {!compact && (heightPx >= 40 || trueDurationMinutes < MIN_BLOCK_MINUTES) && (
                        <span className="block truncate text-[9px]">{formatTimeRange(event.startAt, event.endAt)}</span>
                      )}
                      {!compact && heightPx >= 72 && event.location && (
                        <span className="block truncate text-[9px]">{event.location}</span>
                      )}
                    </button>
                  );
                })}

                {isToday && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 z-10 flex items-center"
                    style={{ top: `${minutesOfDay(now) * PX_PER_MINUTE}px` }}
                  >
                    <span className="h-2 w-2 -translate-x-1 rounded-full bg-danger" />
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
