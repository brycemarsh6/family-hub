import { EventCard } from "./EventCard";
import type { CalendarEventView } from "./CalendarViews";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** The compact "no events today" card — also reused, unchanged, as the
 * `loading` placeholder's body (see this file's own comment on why that
 * reuse is what keeps the loading->resolved transition shift-free for any
 * day that turns out to be genuinely empty). */
function NoEventsCard() {
  return (
    <div className="rounded-xl border border-dashed border-line px-3 py-3 text-sm text-muted">
      No events
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
 * yet, so the gutter renders as a skeleton at the SAME row height as the
 * real one, and the body always renders the plain NoEventsCard rather than
 * guessing at events. That means: any day that ends up having zero events
 * (the common case most days of most weeks) resolves with **no layout
 * shift at all** — loading and resolved render the identical card. A day
 * that turns out to have real events genuinely grows once they're known,
 * which isn't the same bug: `today` is the only thing this component
 * doesn't know in advance, and there's no way to know a day's event count
 * before knowing which day it is. Pinning height any tighter than this
 * would mean guessing at data this component doesn't have.
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
          <NoEventsCard />
        </div>
      </section>
    );
  }

  const { day, today, events, showLocation } = props;
  const isToday =
    day.getFullYear() === today.getFullYear() &&
    day.getMonth() === today.getMonth() &&
    day.getDate() === today.getDate();

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isToday ? "text-accent" : "text-muted"
          }`}
        >
          {WEEKDAY_NAMES[day.getDay()]}
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
          <NoEventsCard />
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              day={day}
              today={today}
              showLocation={showLocation}
            />
          ))
        )}
      </div>
    </section>
  );
}
