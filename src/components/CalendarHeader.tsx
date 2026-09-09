"use client";

import {
  CalendarCheck,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { ActionCircle } from "./ActionCircle";
import { VIEW_LABELS, type CalendarPeriodView } from "@/lib/calendarViewVocabulary";
import { VIEW_CONFIG } from "@/lib/calendarViewConfig";
import { APP_HEADER_HEIGHT_PX } from "@/lib/appChrome";

/**
 * mission-16/C4 — the DOM id ScheduleView.tsx portals its own scroll-driven
 * month title into (see this file's `pinned` branch, below). A plain id +
 * `createPortal`, not a prop: ScheduleView is CalendarViews.tsx's SIBLING,
 * not this component's child, so lifting "which month is topmost on
 * screen" up through CalendarViews and back down as a `title` override
 * would need a change there — and CalendarViews.tsx sits outside this
 * contract's boundary (it already owns the identical, working pattern for
 * "is today visible", `scheduleTodayVisible`/`onTodayVisibleChange`; this
 * is the same problem with no legal way to reuse that wiring). Same
 * precedent as `UserMenu`'s own `document.body` portal, for the same root
 * reason: a value the natural parent can't hand down as a prop. Exported
 * so the contract between the two files is a named constant, not a magic
 * string duplicated in each.
 */
export const SCHEDULE_TITLE_SLOT_ID = "calendar-header-schedule-title-slot";

/**
 * mission-17/C1 — `APP_HEADER_HEIGHT_PX` moved to `src/lib/appChrome.ts`
 * (re-exported into this file's own imports above, not re-declared here):
 * it's a fact about `(app)/layout.tsx`'s `<header>`, not about this
 * component, and a second file (`RecipeList.tsx`) needed the identical
 * number without importing a calendar component to get it. See that
 * module's own comment for the full reasoning and the "one hardcoded copy
 * went stale" history that made this a written STRUCTURE.md rule.
 */

/**
 * mission-16/C4 — this component's OWN rendered height while pinned for
 * Schedule (both rows: the Today/view/Add circles, then the title row),
 * measured the same way and for the same reason as APP_HEADER_HEIGHT_PX
 * above. ScheduleView.tsx adds this to that value to know exactly where
 * its own content starts being visible on screen — the offset its
 * "which month is topmost" observer needs, so the label flips the moment
 * a new month's content actually clears the bottom of this pinned bar,
 * not some other guessed point.
 */
export const SCHEDULE_HEADER_BAR_HEIGHT_PX = 154;

/**
 * The Calendar branch's header row: the Today/view-switcher/Add circles,
 * then the prev/next arrows around the period title. Extracted out of
 * CalendarViews.tsx (mission-8's Captain pass-2 recommendation, made "up
 * front" rather than after K2/K3 pile more onto that file) — this
 * component owns zero state of its own, it only renders what CalendarViews
 * already computed. Every prop below is exactly the value CalendarViews'
 * JSX used to read directly; moving this out changes nothing about what
 * renders, which is why the C4 contract requires a pixel diff before
 * building anything new on top of it.
 *
 * The Add circle (mission-9/C5, Strange's B1 remedy) replaces the
 * FloatingAddButton the Calendar branch used to render on top of the page
 * content. That overlay covered real, tappable day numbers on Month's
 * 7-column grid — the FAB is 56px, wider than a 44.42px cell, so no corner
 * placement escapes it, and a fixed-position overlay can't be moved by
 * document padding either (both were measured and both failed). Removing
 * it here rather than per-view keeps the switcher's own DESIGN.md rule —
 * "its tabs never change as you move" — from being violated by an Add
 * button that would otherwise jump from a floating bottom-left position on
 * Week/Day to a header circle on Month alone.
 */
export function CalendarHeader({
  view,
  onPickView,
  todayResolved,
  isCurrentPeriod,
  onToday,
  title,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
  canManage,
  onAdd,
  onOpenMonthJump,
}: {
  /** The real union, imported rather than hand-written (mission-11/C1) —
   * the local copy that used to sit here was a second place the view
   * vocabulary lived, and it disagreed with `CalendarPeriodView` the moment
   * anything widened the type. It now comes from calendarViewVocabulary.ts,
   * which is also where this file reads the switcher circle's label from
   * (mission-11/C2) — importing `VIEW_CONFIG` out of CalendarViews.tsx for
   * that would have recreated the component-to-component cycle that file's
   * own header warns about. */
  view: CalendarPeriodView;
  onPickView: () => void;
  /** False while useToday() hasn't resolved yet — see CalendarViews.tsx. */
  todayResolved: boolean;
  isCurrentPeriod: boolean;
  onToday: () => void;
  /** Null while `today` hasn't resolved — renders the same pulsing
   * placeholder CalendarViews' inline version did. */
  title: string | null;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
  /** True for admin/parent sessions only — a kid session renders two
   * circles, not three, and `justify-center` re-centers them automatically
   * (no separate layout branch needed). This is UI-only convenience: the
   * real gate is the MANAGER_ROLES check inside the write actions
   * themselves (actions/calendar.ts), same as every other manage-only
   * control in this branch. */
  canManage: boolean;
  onAdd: () => void;
  /**
   * mission-19/C3 — opens the month-jump sheet (`MonthJumpSheet.tsx`, mounted
   * from `CalendarSheets.tsx`). Called from the invisible overlay button
   * below, never from the title `<h2>`/portal slot themselves — see that
   * button's own comment for why.
   */
  onOpenMonthJump: () => void;
}) {
  // mission-16/C4 (D1/Done#4) — Schedule is the one view whose content
  // scrolls far enough, and long enough, for "which month is on screen" to
  // ever change; Week/Day/Month each show one fixed period and never need
  // this. So the pin is scoped to Schedule alone rather than applied to
  // every view. Wrapping in a real element (rather than the bare Fragment
  // this used to return) is what lets that element carry `position:
  // sticky` at all — for every other view this div is unstyled and
  // changes nothing about the rendered layout.
  //
  // mission-17/C3 — this used to be its own `view === "schedule"` test,
  // the second independent one (CalendarViews.tsx's render switch had the
  // other) beside `VIEW_CONFIG`, a total record over all six views with no
  // `pinned` field — so `threeDay` and `year` would have inherited
  // `pinned = false` silently the moment either became reachable
  // (STRUCTURE.md's per-member-difference clause; Captain's finding).
  // Reading `VIEW_CONFIG[view].pinned` instead makes a future view that
  // also wants this decide so in one place rather than reintroducing a
  // second inline test beside the record that already owns the answer.
  const pinned = VIEW_CONFIG[view].pinned;
  // mission-18/C5 (Captain's reachability blocker) — `showArrows` used to
  // be a prop CalendarViews.tsx computed as `view !== "schedule"` and
  // handed down, a third inline per-view test beside this same record.
  // Read the same way `pinned` is, directly above: see `showArrows`'s own
  // comment on `ViewConfig` (calendarViewConfig.ts) for why this was the
  // last chance for that pattern to hide a per-member difference.
  const showArrows = VIEW_CONFIG[view].showArrows;

  return (
    <div
      className={pinned ? "sticky z-20 -mx-4 bg-bg px-4 pb-1 pt-2" : undefined}
      style={pinned ? { top: APP_HEADER_HEIGHT_PX } : undefined}
    >
      <div className="mb-5 flex items-center justify-center gap-10">
        <ActionCircle
          icon={<CalendarCheck aria-hidden="true" size={22} />}
          label="Today"
          onClick={onToday}
          disabled={!todayResolved || isCurrentPeriod}
        />
        <ActionCircle
          icon={<CalendarRange aria-hidden="true" size={22} />}
          // The label comes from the one total `Record<CalendarPeriodView,
          // string>` the picker also reads (mission-11/C2), never a ternary
          // chain. The chain this replaced ended in a catch-all `: "Month"`,
          // so the moment C2 widened the union, Schedule / 3 Day / Year
          // would each have rendered a circle labelled "Month" with no
          // compile error — the label had been protected only by this file
          // hand-writing its own copy of the view union, which C1 correctly
          // removed. A total record makes the label a compiler-checked
          // per-view difference instead.
          label={VIEW_LABELS[view]}
          onClick={onPickView}
        />
        {canManage && (
          <ActionCircle
            icon={<Plus aria-hidden="true" size={22} />}
            label="Add"
            onClick={onAdd}
          />
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        {showArrows && (
          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled}
            aria-label={prevLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
        )}

        {/* Pinned height: this is the one piece of the header whose CONTENT
            depends on `today` (the title text itself), so it's the one
            piece that needs the null-frame and resolved-frame to match
            exactly rather than by coincidence. The buttons on either side
            render identically regardless of `today`, so they need no such
            pinning.

            mission-19/C3 — `relative` added so the overlay button below can
            position against THIS span, not the page. The three branches
            inside are otherwise byte-identical to before this contract:
            the Schedule `pinned` branch in particular is STILL the same
            empty, childless `<span id={SCHEDULE_TITLE_SLOT_ID}>` — see its
            own comment for why it must stay that way.

            mission-19/F3 (Strange's press-state blocker) — `rounded-lg
            transition-colors has-[>button:active]:bg-surface-2` moved HERE,
            onto this span, and removed from the overlay button below. F2's
            first version painted the fill on the button itself, which sits
            at `z-10` above the title/portal-slot/caret (all plain, unpositioned
            flow content) — so the fill painted OVER the title, not behind it,
            erasing it completely by 80ms into an ordinary tap (measured:
            title ink 2509 -> 0, contrast 6.96:1 -> 1.00:1) and doing so with
            the exact token/rounding/row the app's own loading skeleton three
            lines below uses, so a press visually claimed "this is loading"
            instead of "you pressed this". A background painted on a PARENT
            box paints in that box's own background step, which happens
            before any of its children are painted — title, portal slot, and
            caret alike — regardless of the button's z-index, so the fill is
            now structurally behind them rather than merely styled to look
            that way. `:has()` is why no JS state is needed: the browser
            already tracks `:active` on the child button, this only asks the
            parent to read it. Confirmed this doesn't touch this span's own
            box: background-color never affects layout, so the h-7 sizing
            the comment above this one depends on (null/resolved-frame
            equality) is unchanged. */}
        <span className="relative flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg transition-colors has-[>button:active]:bg-surface-2">
          {title === null ? (
            <span aria-hidden="true" className="h-5 w-32 animate-pulse rounded bg-surface-2" />
          ) : pinned ? (
            // mission-16/C4 (D2): the pinned bar owns the one live month
            // label for Schedule. ScheduleView.tsx portals its own
            // scroll-driven `<h2>` into this exact node (see
            // SCHEDULE_TITLE_SLOT_ID's own comment for why a portal, not a
            // prop) — this span renders NOTHING of its own on purpose: any
            // fallback children here would sit ALONGSIDE the portaled
            // content in the live DOM rather than being replaced by it,
            // producing exactly the double label D2 exists to prevent.
            // `title` (the anchor's static month) is intentionally unused
            // in this branch — ScheduleView's live answer is what's shown.
            <span id={SCHEDULE_TITLE_SLOT_ID} className="flex w-full items-center justify-center" />
          ) : (
            <h2 className="truncate text-lg font-semibold">{title}</h2>
          )}

          {/* mission-19/F2 (Strange's blocker) — a visible affordance that
              the title row opens the month-jump sheet. A flex SIBLING of
              the three branches above (never a child of the portal slot —
              see that branch's own comment), glued to the title via the
              parent's `gap-1` rather than pinned to the row's right edge:
              Strange measured a `justify-end` caret leaving a 78.3px gap
              from Schedule's title (a 343px span with no arrows) versus
              26.3px on the arrow views, far enough to read as unrelated to
              the title it's meant to belong to. An 18px glyph inside the
              shared `h-7` box adds no flow height on any view — verified
              unchanged in both the null-frame and the resolved-frame.

              mission-19/F3 (Strange's NOTE 1) — dimmed to `opacity-40`
              while `title === null` (the same condition the skeleton
              placeholder branch above and the overlay button's own
              `disabled` prop already key off — all three describe the
              identical "today hasn't resolved yet" moment). Before this,
              the caret was the ONE control in this row still at full
              opacity while Today/Prev/Next were all dimmed to 0.4 and
              disabled — the brightest mark in a row of dimmed, inert
              controls, on a control that is itself disabled underneath it.
              `disabled:` can't reach the caret directly (it's a sibling of
              the button, not a descendant), so this reads the same
              condition the button's `disabled` prop already reads, rather
              than inventing a second source of truth for "is today ready
              yet". Paint-only: opacity never affects layout, so this
              changes nothing in the geometry table. */}
          <ChevronDown
            aria-hidden="true"
            size={18}
            className={title === null ? "shrink-0 text-muted opacity-40" : "shrink-0 text-muted"}
          />

          {/* mission-19/C3 — THE control every view opens the month-jump
              sheet from. A SIBLING of the three branches above, not a
              child of any one of them — deliberately, because the Schedule
              branch's own span must stay exactly as it was (see its
              comment just above): adding a click target INSIDE it, or
              swapping it for a `<button>`, would either put fallback
              content next to ScheduleView's portaled `<h2>` (the double-
              label bug D2 already fixed once) or hand the portal target
              itself `disabled`/button semantics that have nothing to do
              with what's portaled into it.

              THE DESIGN DECISION THIS CONTRACT ASKED FOR, WRITTEN DOWN:
              this wraps the slot rather than becoming it, AND it wraps by
              overlaying rather than by growing the shared `h-7` box. A
              plain `min-h-11` on that box (the naive fix) would have
              worked on the five arrow-views for free (their row is
              already 44px because of the arrows either side), but
              Schedule's row has NO 44px sibling to hide the growth behind
              (`showArrows` is false there) — the row's OWN flow height
              would have grown 28px -> 44px, and `SCHEDULE_HEADER_BAR_HEIGHT_PX`
              below (which ScheduleView.tsx, out of this contract's
              boundary, adds to its own scroll-offset math) would have gone
              stale the moment this shipped.

              Instead, this button is `position: absolute` — entirely
              outside document flow — so it contributes NOTHING to the row's
              rendered height on any view. Its own box is what gets measured
              for the 44px floor: `-inset-y-[9px]` expands 9px past the
              shared span's top and bottom edges, so a 28px box becomes a
              46px hit target (28 + 9 + 9), comfortably clearing 44 rather
              than landing exactly on the boundary. On the five arrow-views
              that 46px sits centered inside the row's own already-44px
              height (spilling by 1px into the row's own margin either
              side — inconsequential, nothing else occupies that space); on
              Schedule it spills into the pinned bar's own padding/margin
              instead of growing the bar. Either way: the row's rendered
              height is UNCHANGED from before this contract, on every view,
              in both the null-frame and the resolved-frame — which is what
              keeps `SCHEDULE_HEADER_BAR_HEIGHT_PX` correct with no edit
              needed, and what keeps the null/resolved frames matching
              (they already matched at h-7; nothing about this button's
              presence depends on `title`, so it changes nothing about that
              equality).

              `disabled` while `today` hasn't resolved yet, matching every
              other header control's convention (`onToday`'s own
              disabled={!todayResolved || isCurrentPeriod}` just above) —
              there is no anchor to seed the sheet with before then.

              mission-19/F2 — added a press fill matching the Prev/Next
              arrows in this same row, so a plain tap wasn't zero pixels of
              change until the sheet's own open animation started. F3
              (Strange's blocker): that fill lived on THIS button, which
              sits above the title/caret in paint order (an absolutely
              positioned element paints above in-flow content regardless of
              z-index) — so it painted OVER the title instead of behind it,
              erasing it completely partway into an ordinary tap. The fill
              itself moved up to the parent span above (see its own comment)
              so it paints behind everything in this box instead; this
              button now contributes NOTHING visible, only the click target
              and its geometry — unchanged from F2/C3, still the same
              `-inset-y-[9px]` 46px-tall hit box that the giant comment two
              blocks up depends on. */}
          <button
            type="button"
            onClick={onOpenMonthJump}
            disabled={!todayResolved}
            aria-label="Jump to a month or day"
            className="absolute inset-x-0 -inset-y-[9px] z-10"
          />
        </span>

        {showArrows && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={nextLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        )}
      </div>
    </div>
  );
}
