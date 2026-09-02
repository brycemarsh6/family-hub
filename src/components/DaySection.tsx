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

/** Shown for a day that falls outside page.tsx's fetch window (see its
 * WINDOW_DAYS comment) — its events were never queried, so "No events"
 * would be a false claim rather than an honest one. In normal use this is
 * unreachable (CalendarViews disables Prev/Next at the window edge), but a
 * view switch right at that edge can still land here — same
 * validate-AND-clamp defense-in-depth shape as the V2 all-day fix in
 * actions/calendar.ts, applied to a UI truth instead of a database row. */
function NotLoadedCard() {
  return (
    <div className="rounded-xl border border-dashed border-line px-3 py-3 text-sm text-muted">
      Outside the loaded range
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
        /** True when `day` sits outside page.tsx's fetch window — see
         * NotLoadedCard's own comment above for why that's a third state,
         * distinct from both loading and genuinely-empty. Defaults false
         * so every other caller (and every existing test/screenshot) is
         * unaffected. */
        notLoaded?: boolean;
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

  const { day, today, events, showLocation, compact, notLoaded } = props;
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
        {events.length === 0 ? (
          notLoaded ? (
            <NotLoadedCard />
          ) : (
            <NoEventsCard />
          )
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              day={day}
              today={today}
              showLocation={showLocation}
              compact={compact}
            />
          ))
        )}
      </div>
    </section>
  );
}
