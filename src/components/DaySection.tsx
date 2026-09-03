import { CalendarOff } from "lucide-react";
import { EventCard } from "./EventCard";
import { SkeletonBlock } from "./Skeleton";
import type { CalendarEventView } from "@/lib/types";
import { isSameDay, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";

/** The compact "no events today" card — genuinely empty, not loading and
 * not outside the fetched window. Those are two DIFFERENT other states
 * (see the `loading` branch below and `NotLoadedCard`) — this repo's own
 * dashboard lesson is that a loading frame must never say something as
 * crisp and factual as "No events" about data it hasn't looked at yet, and
 * a day outside the query window hasn't been looked at either. */
function NoEventsCard() {
  return (
    <div className="rounded-xl border border-dashed border-line px-3 py-3 text-sm text-muted">
      No events
    </div>
  );
}

/** Shown for a day the fetch window doesn't FULLY contain — see
 * calendarDates.ts's `isOutsideWindow` (full containment: the day's own
 * local START must not precede windowStart AND its own local END must not
 * exceed windowEnd). Rendered whenever `notLoaded` is true REGARDLESS of
 * whether any events were actually fetched for that day — a day whose
 * START is inside the window but whose END exceeds it (mission-8's V4: the
 * household's Mountain browser runs six hours behind the server's UTC
 * clock, so an evening event on the last loaded day can sit past
 * windowEnd) still receives SOME rows from page.tsx's overlap query, and
 * showing it as a normal, complete day would be a false "this day is fully
 * known" claim over data that's actually partial. Any cards that WERE
 * fetched for that day still render alongside this notice below, not
 * instead of it. Genuinely reachable in ordinary navigation, not just a
 * stray view-switch edge case: the closest day of a reachable Week/Day
 * period can itself be only partially loaded, because its local END can run
 * past windowEnd even when its start is comfortably inside — confirmed live
 * at both the forward and back edges. It became MORE reachable, not less,
 * once mission-9's C6 made paging unbounded: the arrows are never disabled
 * at the fetched window's edges any more, so the cursor can outrun the
 * window while the next fetch is in flight. (This paragraph used to cite
 * calendarDates.ts's `canStepToPeriod` as the refusal-to-page rule that
 * bounded the case; that wall is what C6 retired, and mission-10/CV0
 * deleted the now-dormant predicate itself.)
 *
 * Deliberately NOT NoEventsCard's dashed-and-crisp look (mission-8's
 * Strange pass-2 finding): seven visually-identical dashed cards on a
 * paged-out week read as seven empty days until the last one is actually
 * read, which is the same "unknown must not look like empty" lesson S1
 * already applied to the loading state — the app now has THREE states
 * that must each look distinct (loading, empty, unknown), not two. Solid
 * fill, no dash, an icon, and a plain-language hint naming the actual
 * limit and the way back. */
function NotLoadedCard() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-sm text-muted">
      <CalendarOff aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      <span>
        Not all events loaded
        <span className="mt-0.5 block text-xs">
          Marshee shows about two months each way — tap Today to come back.
        </span>
      </span>
    </div>
  );
}

/**
 * One calendar day: the gutter (weekday + day number, today marked) and
 * that day's event cards. Week view renders seven of these, Day view
 * renders one — this is the one implementation both use, per the plan
 * ("DaySection reused by Week and Day").
 *
 * `loading` covers the brief window where useToday() hasn't resolved yet
 * (see CalendarViews.tsx) — there is no real `day` to show gutter text for
 * yet, so the gutter renders as a skeleton, and so does the body: a grey
 * `SkeletonBlock` at NoEventsCard's own measured height (46px), NOT
 * NoEventsCard itself. An earlier version reused the real NoEventsCard
 * component here on the theory that "identical markup" is the safest way
 * to guarantee no layout shift — measured, that's true of the row HEIGHT,
 * but it also means the streamed HTML asserts "No events" for every day
 * before the server query has even run, which is a false statement for
 * any day about to show real events (Strange's S1 finding, mission-8).
 * This app's own dashboard lesson is exactly the fix: loading is grey
 * bars, "nothing here" is a crisp glyph, and the two must never render as
 * the same component. The no-shift property is kept **by construction**
 * instead — 46px is NoEventsCard's own measured height, so the loading
 * row and a genuinely-empty resolved row are still the same size, they
 * just no longer claim the same fact. A day that turns out to have real
 * events genuinely grows once they're known, which isn't the same bug:
 * `today` is the only thing this component doesn't know in advance, and
 * there's no way to know a day's event count before knowing which day it
 * is. Pinning height any tighter than this would mean guessing at data
 * this component doesn't have.
 */
export function DaySection(
  props:
    | { loading: true }
    | {
        loading?: false;
        day: Date;
        today: Date;
        events: CalendarEventView[];
        /** Day view has room to show a card's location; Week's cards stay
         * compact. Threaded straight through to EventCard. */
        showLocation?: boolean;
        /** Week keeps titles single-line (`truncate`) so the agenda list
         * stays scannable; Day view exists specifically to read a whole
         * title, so it leaves this false and wraps instead. A separate
         * prop from `showLocation` on purpose — the two happen to move
         * together in K1 (Week sets one true and the other false), but
         * conflating them would mean "show the location" and "keep this
         * short" could never vary independently later. Threaded straight
         * through to EventCard. */
        compact?: boolean;
        /** True when the fetch window doesn't FULLY contain `day` — see
         * NotLoadedCard's own comment above for why that's a third state,
         * distinct from both loading and genuinely-empty, and why it's
         * checked regardless of whether `events` happens to be non-empty
         * (a partially fetched day is exactly the case this must catch).
         * Defaults false so every other caller (and every existing test/
         * screenshot) is unaffected. */
        notLoaded?: boolean;
        /** Opens the detail sheet for one event, on the day it's rendered
         * for — see EventCard/EventDetailSheet. Required (mission-9/C2b —
         * the sole caller, CalendarViews.tsx, always passes one; the `?`
         * only ever masked that). */
        onOpenEvent: (event: CalendarEventView, day: Date) => void;
      },
) {
  if (props.loading) {
    return (
      <section>
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            aria-hidden="true"
            className="h-4 w-8 animate-pulse rounded bg-surface-2"
          />
          <span
            aria-hidden="true"
            className="h-7 w-7 animate-pulse rounded-full bg-surface-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-[46px] w-full" />
        </div>
      </section>
    );
  }

  const { day, today, events, showLocation, compact, notLoaded, onOpenEvent } = props;
  const isToday = isSameDay(day, today);

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isToday ? "text-accent" : "text-muted"
          }`}
        >
          {SHORT_DAY_NAMES[day.getDay()]}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
            isToday ? "bg-accent text-accent-fg" : "text-fg"
          }`}
        >
          {day.getDate()}
        </span>
      </div>

      <div
        className={`flex flex-col gap-2 ${
          isToday ? "border-l-2 border-accent pl-3" : ""
        }`}
      >
        {/* Three independent facts, not one either/or: `notLoaded` renders
            the caveat whenever it's true, no matter how many events came
            back for this day — a day the window only partially covers is
            exactly the case that must never look complete (mission-8's
            V4). The empty glyph renders only when the day IS fully loaded
            AND genuinely has zero events, never merely because `events`
            happens to be empty. And every fetched card always renders
            regardless of `notLoaded`, since a real row we DID get for this
            day is still worth showing next to the caveat, not replaced by
            it. */}
        {notLoaded && <NotLoadedCard />}
        {!notLoaded && events.length === 0 && <NoEventsCard />}
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            day={day}
            today={today}
            showLocation={showLocation}
            compact={compact}
            onOpen={() => onOpenEvent(event, day)}
          />
        ))}
      </div>
    </section>
  );
}
