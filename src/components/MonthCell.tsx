import { CalendarOff } from "lucide-react";
import { avatarColorHex } from "@/lib/constants";
import { isPast } from "@/lib/calendarDates";
import { formatDayLabel } from "@/lib/mealPlanDates";
import { hexToRgba } from "@/lib/color";
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
  /** mission-14/C3b: true only for a completed TASK slot (MonthGrid.tsx
   * checks `completedAt !== null` against the real Task rows before this
   * shape is built — a plain CalendarEventView, which `event` above is
   * typed as, has no such field, and a real event must never set this).
   * `false` for every event and for an open task. See the render below for
   * why this needs its own always-visible glyph rather than leaning on
   * `line-through` alone. */
  taskCompleted: boolean;
} | null;

/** Up to THREE diagonal color bands, not one-per-person like EventCard's
 * uncapped version — the mission brief's own words ("a multi-person pill
 * shows up to three color bands") are a deliberate, tighter constant for
 * Month's much smaller pill, not a bug inherited from EventCard. Alpha
 * values (0.10 normal / 0.05 past) and the `var(--surface)` opaque backdrop
 * the caller supplies are copied exactly from EventCard's own already-
 * measured numbers (Strange, mission-8, worst case 4.64:1 light / 5.53:1
 * dark against all 8 AVATAR_COLORS) — reusing the identical inputs is what
 * makes reusing that contrast finding valid here too, without a new pass.
 * The cap at three bands lives in the CALLER (this file's own `slice(0, 3)`
 * below), not in this function — it just renders however many colors it's
 * handed. */
function pillBackground(colors: string[], alpha: number): string {
  if (colors.length === 0) return "var(--surface-2)";
  const bandWidth = 100 / colors.length;
  const stops = colors.flatMap((hex, index) => {
    const color = hexToRgba(hex, alpha);
    return [`${color} ${index * bandWidth}%`, `${color} ${(index + 1) * bandWidth}%`];
  });
  return `linear-gradient(135deg, ${stops.join(", ")}), var(--surface)`;
}

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
            const done = slot.taskCompleted;
            const colors = slot.event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
            return (
              <span
                key={lane}
                className={`block h-4 truncate border-y px-1 text-[9px] leading-4 ${
                  past || done ? "font-medium text-muted border-muted" : "font-semibold text-fg border-fg"
                } ${slot.roundLeft ? "rounded-l border-l" : ""} ${slot.roundRight ? "rounded-r border-r" : ""}`}
                style={{ background: pillBackground(colors, past || done ? 0.05 : 0.1) }}
              >
                {/* C3b: below `md` the title span two lines down is
                    `sr-only` (see B3's comment there) — genuinely `display:
                    none`-equivalent for sighted readers at 375px, not just
                    small. Putting `line-through` ONLY on that hidden text
                    would satisfy the letter of "strike through a completed
                    task" while being invisible on exactly the phone
                    viewport this contract measures. A checkmark glyph is
                    the one thing this pill has room for at EVERY
                    breakpoint (below `md` a pill currently shows nothing
                    but color/border — B3 below — so a 1-character glyph
                    fits where zero characters fit before), so it renders
                    unconditionally on `showLabel` (never on a continuation
                    column with no title of its own — moot in practice
                    today since a Task is always single-day/single-column,
                    but kept consistent with how the title itself is
                    gated). `line-through` is layered on TOP of that glyph
                    once the title becomes visible at `md`+, joining
                    TaskCard.tsx's and GroceryRow.tsx's existing "struck off
                    a list" vocabulary rather than inventing a second one
                    for the same fact. aria-hidden because the checkmark is
                    decorative pixels only — same call TaskCard.tsx made for
                    its own checkbox glyph, and this cell's accessible name
                    is already fully owned by the day BUTTON's own
                    aria-label (`Open ${formatDayLabel(day)}` above) — an
                    aria-label always wins over child text content when
                    computing an element's accessible name, so this span's
                    text is ignored there regardless. */}
                {done && slot.showLabel && (
                  <span aria-hidden="true" className="mr-0.5">
                    ✓
                  </span>
                )}
                {/* B3 (mission-9/C5, figure corrected mission-9/C8): at
                    375px the pill's inner slot measures ~38px
                    (`500 9px Inter`) and holds roughly 7-8 characters
                    (measured live: 7 by Vision, 8 by Strange) — NOT the "~2"
                    this comment used to claim. Still not enough for any real
                    title, and still enough to make two DIFFERENT events
                    sharing a prefix ("Ledger Pre-School" / "Ledger soccer")
                    render identically or near-identically, which is worse
                    than no label at all (Strange's finding). Below `md` the
                    pill is colour-only,
                    same as Google's and Apple's own phone month grids —
                    "+N more" and the day tap carry identification instead.
                    At `md` and up (Strange measured 768px: 9–10 characters
                    fit and it genuinely works) the title reappears; no font
                    shrink, no contrast change, both forbidden by the
                    contract.

                    B5 (mission-9/C7): below `md` the fill alone is the ONLY
                    visual carrier that an event exists here, and Strange
                    measured that fill at 1.00–1.24:1 against the page —
                    invisible by WCAG 1.4.11's 3:1 bar. The `border-y`/
                    `border-l`/`border-r` above (gated on the SAME
                    roundLeft/roundRight flags that already decide rounding,
                    so a continuing bar's shared edge between two cells stays
                    seamless) fixes that without touching alpha or `--line`
                    (both dead ends Strange already measured: fill α 0.40
                    still only 1.51:1, `--line` is 1.24:1 light). `border-fg`
                    (6.96:1 light / 15.23:1 dark) and `border-muted` (4.75 /
                    6.81) both clear 3:1 in both themes — and reusing them
                    for past-vs-live restores the ended-event dimming K1
                    asked for to something visible below `md`, where the
                    0.05-vs-0.10 fill alpha delta alone is imperceptible.

                    B6 (mission-9/C7): `hidden` is `display:none`, which
                    strips the title from the accessibility tree — Strange
                    measured 0 AX nodes naming an event at 375px, all 43
                    cells reading identically regardless of content.
                    `sr-only` is absolute-positioned + clipped, so it keeps
                    the node in the AX tree while contributing zero layout —
                    the phone view stays pixel-identical to what C5 shipped,
                    border aside. */}
                <span
                  className={`sr-only md:not-sr-only md:inline ${done ? "line-through" : ""}`}
                >
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
