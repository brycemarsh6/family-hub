import { CalendarOff } from "lucide-react";
import { avatarColorHex } from "@/lib/constants";
import { isPast } from "@/lib/calendarDates";
import { formatDayLabel } from "@/lib/mealPlanDates";
import { bandedBackground } from "@/lib/color";
import type { CalendarEventView } from "@/lib/types";

/**
 * One event's slot inside a single Month cell — `null` means that lane is
 * genuinely empty for this day (see the module comment on why an empty
 * slot can sit right next to real overflow). `roundLeft`/`roundRight` are
 * computed PER ROW by MonthGrid.tsx (mission-9/C2b), never inferred here
 * from `event`'s own true start/end — a bar that's merely clipped by this
 * row (continuing from/into an adjacent week) gets an open (unrounded)
 * edge instead, which is what keeps the week-break continuation honest
 * (Vision's proof that a continuing bar may land on a DIFFERENT lane
 * number in the next row rules out any connector that assumes lane
 * alignment across the break — see monthLayout.ts's own header).
 */
export type MonthCellSlot = {
  event: CalendarEventView;
  /** Only the leftmost column of a span, in THIS row, shows the title —
   * matches Google Calendar's own convention of re-labelling a bar at the
   * start of every row it wraps into, so a family scanning a continuation
   * row isn't left guessing which bar is which. */
  showLabel: boolean;
  roundLeft: boolean;
  roundRight: boolean;
  /** mission-14/C3b + mission-16/C2: which of the three kinds of slot this
   * is. `null` means a real event — a plain CalendarEventView, which
   * `event` above is typed as, has no completion concept at all, and a
   * real event must never set this to anything but `null`. `"open"` /
   * `"completed"` mean a TASK slot (MonthGrid.tsx checks `completedAt` on
   * the real Task rows before this shape is built) that is respectively
   * not-yet-done or done.
   *
   * Before mission-16/C2 this was a bare `taskCompleted: boolean` that
   * could only say "completed task" vs. "everything else" — so an OPEN
   * task and a real EVENT rendered pixel-identically, and "no mark" was
   * doing two different jobs (this is genuinely an event / this is a task
   * nobody's done yet) with the same absence of a glyph. See the render
   * below for why each of the three states gets its own always-visible
   * glyph (or none) rather than leaning on `line-through` alone. */
  taskStatus: "open" | "completed" | null;
} | null;

// Up to THREE diagonal color bands, not one-per-person like EventCard's
// uncapped version — the mission brief's own words ("a multi-person pill
// shows up to three color bands") are a deliberate, tighter constant for
// Month's much smaller pill, not a bug inherited from EventCard. Alpha
// values (0.10 normal / 0.05 past) and the `var(--surface)` opaque backdrop
// are copied exactly from EventCard's own already-measured numbers
// (Strange, mission-8, worst case 4.64:1 light / 5.53:1 dark against all 8
// AVATAR_COLORS) — reusing the identical inputs is what makes reusing that
// contrast finding valid here too, without a new pass. The cap at three
// bands lives HERE (this file's own `slice(0, 3)` below), not in
// `bandedBackground` itself — that function just renders however many
// colors it's handed. `bandedBackground` (src/lib/color.ts) used to be a
// private copy in this file named `pillBackground` — mission-17/C5 hoisted
// it after Fury found it byte-for-byte identical to TimelineGrid.tsx's own
// `blockBackground`, the same "must-not-touch boundary satisfied by
// copying" failure color.ts's own header already names for `hexToRgba`, one
// call stack higher. See that file's header for the full reasoning and why
// EventCard.tsx's `bandBackground` stays a genuinely separate function.

/**
 * One day of the Month grid: the day number (adjacent-month muted, today
 * accent-circled — today wins even on an adjacent-month padding day, since
 * knowing "today" matters more than which month a filler day belongs to),
 * up to three pill/bar slots, an optional "+N more" line, and the smaller
 * not-loaded glyph (C4's `CalendarOff`, per the contract) when the fetch
 * window doesn't fully cover this day. The WHOLE cell is one `<button>` —
 * not just the day number — both because nothing else inside is
 * independently interactive (a button nested in a button is invalid HTML)
 * and because it's what gives "tap the day number" a real ≥44px target
 * without visually blowing up the number glyph itself to fill it; see
 * mission-9's C2b evidence for the measured rect.
 */
export function MonthCell({
  day,
  today,
  isCurrentMonth,
  isToday,
  notLoaded,
  slots,
  overflow,
  onOpen,
}: {
  day: Date;
  today: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  notLoaded: boolean;
  /** Always length 3 (`VISIBLE_LANES` in MonthGrid.tsx, which builds this
   * per column from one row's `assignLanes` call). */
  slots: MonthCellSlot[];
  overflow: number;
  onOpen: () => void;
}) {
  // B4 (mission-9/C5, Strange's finding): only render lanes UP TO the last
  // genuinely filled one. A `null` slot BELOW that point is an interior gap
  // — a hidden bar in a lane a DIFFERENT column occupies — and must still
  // render as a blank spacer, or same-lane pills in neighbouring columns
  // would drift out of vertical alignment. A `null` slot AFTER the last
  // filled one is pure reserved space nobody's using; rendering it left a
  // visible 16px hole directly above "+N more" that read as a bug rather
  // than as "this day only has two things." Dropping only the trailing
  // slice keeps constraint 2 (2 pills + "+1 more" with a legitimately empty
  // THIRD slot mid-column) intact — that empty slot is interior when a
  // later column's bar still owns lane 2 in this row, so it's still drawn.
  let lastFilledLane = -1;
  for (let lane = slots.length - 1; lane >= 0; lane--) {
    if (slots[lane]) {
      lastFilledLane = lane;
      break;
    }
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${formatDayLabel(day)}`}
      className="flex min-h-11 w-full flex-col gap-0.5 rounded-md p-1 text-left transition-colors active:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={
            isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg"
              : `text-[11px] font-semibold ${isCurrentMonth ? "text-fg" : "text-muted"}`
          }
        >
          {day.getDate()}
        </span>
        {notLoaded && (
          <CalendarOff
            aria-hidden="true"
            size={10}
            className="shrink-0 text-muted"
          />
        )}
      </div>

      {lastFilledLane >= 0 && (
        // B2 (mission-9/C5): `-mx-1` cancels this button's own `p-1`
        // padding for the pill track ONLY — the day number and "+N more"
        // above/below keep theirs. Combined with MonthGrid's ROW_CLASS
        // losing its column gap, a pill now reaches all the way to the
        // cell boundary on every side, so two adjacent cells' pills for the
        // SAME spanning bar touch with zero page-background showing
        // between them — that gap (not the rounding logic, which was
        // already correct) is what made a 3-day bar read as three
        // unrelated chips.
        <div className="-mx-1 flex flex-col gap-0.5">
          {Array.from({ length: lastFilledLane + 1 }, (_, lane) => {
            const slot = slots[lane];
            if (!slot) return <span key={lane} aria-hidden="true" className="block h-4" />;
            const past = isPast(slot.event.endAt, today);
            // C3b: a completed task is "done", which is a DIFFERENT claim
            // from a past event being merely over (see EventCard.tsx:63-73's
            // corrected comment — `line-through` means done, and a past
            // event must never carry it). `done` therefore drains weight and
            // tint the same way `past` already does (same muted/border
            // classes, same halved fill alpha below) rather than inventing a
            // second dimming scale, but is checked independently: a task
            // completed ahead of its due date (not yet `past`) still reads
            // as done, and a task that's merely overdue but not completed
            // stays in the normal "font-semibold text-fg" style — matching
            // TaskCard.tsx's own "no overdue treatment, only completedAt
            // changes rendering" rule.
            const done = slot.taskStatus === "completed";
            // mission-16/C2: an open task is neither a completed task nor
            // a real event, and until now rendered identically to one —
            // "no mark" was doing two jobs (this is genuinely an event /
            // this is a task nobody's done yet). An open task is NOT
            // `past || done` by itself (TaskCard.tsx's "no overdue
            // treatment" rule applies here too — see `done`'s own comment
            // above), so it gets the live "font-semibold text-fg" styling
            // whenever it isn't independently past its due day.
            const openTask = slot.taskStatus === "open";
            const colors = slot.event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
            return (
              <span
                key={lane}
                className={`block h-4 truncate border-y px-1 text-[9px] leading-4 ${
                  past || done ? "font-medium text-muted border-muted" : "font-semibold text-fg border-fg"
                } ${slot.roundLeft ? "rounded-l border-l" : ""} ${slot.roundRight ? "rounded-r border-r" : ""}`}
                style={{ background: bandedBackground(colors, past || done ? 0.05 : 0.1) }}
              >
                {/* C3b / mission-18/C2: the title span two lines down used
                    to be `sr-only` below `md` (see B3's comment there) —
                    genuinely `display: none`-equivalent for sighted readers
                    at 375px, not just small — which is why this checkmark
                    glyph was originally added: it was the one thing this
                    pill had room for at EVERY breakpoint, since below `md`
                    the pill showed nothing but color/border otherwise.
                    mission-18/C2 dropped that `md:` gate, so the title now
                    renders at every width too — but the glyph stays, because
                    it's still a much stronger "done" signal than the title
                    is: B3 below measures only ~5 characters of an
                    already-truncated, 9px `line-through` title once the
                    glyph itself is sharing the same box, which reads far
                    less reliably at a glance than one glyph that never
                    truncates. Renders unconditionally on `showLabel` (never
                    on a continuation column with no title of its own — moot
                    in practice today since a Task is always
                    single-day/single-column, but kept consistent with how
                    the title itself is gated). `line-through` is layered on
                    the title alongside it (not "on top of" — both are
                    visible at every width now, not sequenced by breakpoint),
                    joining TaskCard.tsx's and GroceryRow.tsx's existing
                    "struck off a list" vocabulary rather than inventing a
                    second one for the same fact — and per DESIGN.md,
                    `line-through` means DONE, never merely PAST (see the
                    `done`/`past` split above: a `past`-but-not-`done` event
                    never gets this class). aria-hidden because the
                    checkmark is decorative pixels only — same call
                    TaskCard.tsx made for its own checkbox glyph, and this
                    cell's accessible name is already fully owned by the day
                    BUTTON's own aria-label (`Open ${formatDayLabel(day)}`
                    above) — an aria-label always wins over child text
                    content when computing an element's accessible name, so
                    this span's text is ignored there regardless. (The
                    TITLE span two lines down is a separate matter — see B6:
                    its own text is still exposed as a named node elsewhere
                    in the tree, unaffected by the button's aria-label.) */}
                {done && slot.showLabel && (
                  <span aria-hidden="true" className="mr-0.5">
                    ✓
                  </span>
                )}
                {/* mission-16/C2: the OPEN-task twin of the checkmark just
                    above — same placement (`mr-0.5`, gated on `showLabel`
                    for the identical reason), same aria-hidden reasoning
                    (this cell's accessible name is the day button's own
                    aria-label, not this span's text), and it inherits the
                    SAME color class as the rest of this pill (`text-fg` or
                    `text-muted`, decided by the `past || done` ternary
                    above) rather than a color of its own — so its contrast
                    against the pill background is exactly the border-fg/
                    border-muted figures already measured in B5's comment
                    below (6.96:1 light / 15.23:1 dark live, 4.75:1 /
                    6.81:1 past), not a new pair of numbers to verify.
                    `done` and `openTask` can never both be true (taskStatus
                    is one of exactly three values), so this and the
                    checkmark above never render together. */}
                {openTask && slot.showLabel && (
                  <span aria-hidden="true" className="mr-0.5">
                    ☐
                  </span>
                )}
                {/* B3 (mission-9/C5, figure corrected mission-9/C8,
                    breakpoint gate DROPPED mission-18/C2 — this is the
                    "stale rationale" that contract set out to replace): at
                    375px the pill's inner slot measures ~38-40px
                    (`500`/`600` weight, `9px` Inter — clientWidth minus
                    padding gives ~38px, `getBoundingClientRect()` minus
                    padding gives ~40px; the gap is sub-pixel/border
                    rounding, not a real disagreement) and holds 6-8
                    characters of a REAL household event title before CSS
                    `truncate` ellipsizes it — re-measured live,
                    mission-18/C2, with `Range.getClientRects()` (never
                    `getBoundingClientRect()` on the truncated ancestor,
                    which can't see where the glyph run itself would fall —
                    that's the general lesson from CV4's own label-overflow
                    history, applied here before it repeated): for each of
                    the real event titles on the currently-rendered month,
                    binary-searched the largest leading substring of the
                    text node whose rendered rect still fits inside the
                    pill's own padding box. Four real titles measured 6, 7,
                    and 8 (twice) — consistent with, not a copy of, the
                    "7-8" this comment already carried from mission-9/C8; NOT
                    the "~2" an earlier version of this same comment claimed
                    before that. A completed task's pill has less room again
                    — measured 5, not 6-8 — because the `✓` glyph above eats
                    real space out of the same box before the title even
                    starts. Still not enough for any real title, and still
                    enough to make two DIFFERENT events sharing a prefix
                    ("Ledger Pre-School" / "Ledger soccer") render
                    identically or near-identically, which is worse than no
                    label at all (Strange's finding) — mitigated, not
                    solved, by "+N more" and the day tap still carrying full
                    identification.

                    mission-18/C2 removed the `md:` gate entirely: the title
                    now renders at every width, matching Google's and
                    Apple's own phone month grids only in the sense that
                    both truncate hard — those hide the title below a
                    breakpoint too, this app no longer does, because a
                    375px phone is the household's actual daily case. No
                    font shrink, no contrast change; both were forbidden by
                    the original C7/C8 contracts and remain untouched here.

                    B5 (mission-9/C7): even with the title visible at every
                    width now, the FILL alone is still not an adequate
                    visual carrier by itself — Strange measured that fill at
                    1.00–1.24:1 against the page, invisible by WCAG 1.4.11's
                    3:1 bar, and a title truncated to 5-8 characters (B3
                    above) is too weak a backstop on its own for a pair of
                    events that are blank-looking or near-identical at a
                    glance. The `border-y`/`border-l`/`border-r` above
                    (gated on the SAME roundLeft/roundRight flags that
                    already decide rounding, so a continuing bar's shared
                    edge between two cells stays seamless) fixes the
                    CONTRAST problem without touching alpha or `--line`
                    (both dead ends Strange already measured: fill α 0.40
                    still only 1.51:1, `--line` is 1.24:1 light). `border-fg`
                    (6.96:1 light / 15.23:1 dark) and `border-muted` (4.75 /
                    6.81) both clear 3:1 in both themes — and reusing them
                    for past-vs-live keeps the ended-event dimming K1 asked
                    for visible at every width, not just below the old `md`
                    gate.

                    B6 (mission-9/C7; the switch this note explains is now
                    historical after mission-18/C2, kept for why `sr-only`
                    was the right choice while the switch existed): this
                    file used to flip the title between `hidden`
                    (`display:none`, which strips it from the accessibility
                    tree — Strange measured 0 AX nodes naming an event at
                    375px, all 43 cells reading identically regardless of
                    content) and `sr-only` (absolute-positioned + clipped,
                    which keeps the node in the AX tree while contributing
                    zero layout) depending on the `md` breakpoint.
                    mission-18/C2 deleted the switch outright — the title is
                    now plain, unconditionally visible inline content, so
                    it's exposed to assistive tech the ordinary way a
                    browser exposes any visible text, no special-casing
                    needed. Re-verified directly rather than assumed: the
                    same real event titles that were accessible-name-exposed
                    before this change (via `sr-only`) are still exposed,
                    at their full un-truncated length, after it — CSS
                    `text-overflow: ellipsis` only affects what's PAINTED,
                    never the accessible name computed from the underlying
                    text. */}
                <span className={done ? "line-through" : ""}>
                  {slot.showLabel ? slot.event.title : ""}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {overflow > 0 && (
        <span className="text-[9px] leading-tight text-muted">+{overflow} more</span>
      )}
    </button>
  );
}
