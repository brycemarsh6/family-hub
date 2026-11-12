import { AvatarBadge } from "./AvatarBadge";
import { avatarColorHex } from "@/lib/constants";
import { formatAllDayLabel, formatTimeRange, isPast } from "@/lib/calendarDates";
import { personFill } from "@/lib/color";
import { matchedPrefixLength } from "@/lib/calendarSearch";
import type { CalendarEventView } from "@/lib/types";

/**
 * Mission 75 (search page): `text` with the words that start with one of the typed `words`
 * (`searchWords()` of the query) marked. No `words` renders the text unchanged. Lives
 * here so EventCard and TaskCard share it; it needs no state.
 */
export function HighlightedText({ text, words }: { text: string; words?: string[] }) {
  if (!words || words.length === 0) return <>{text}</>;
  return (
    <>
      {text.split(/([\p{L}\p{M}\p{N}]+)/u).map((part, index) => {
        if (index % 2 === 0) return part;
        const length = matchedPrefixLength(part, words);
        if (length === 0) return part;
        return (
          <span key={index}>
            <mark className="rounded bg-highlight text-fg">{part.slice(0, length)}</mark>
            {part.slice(length)}
          </span>
        );
      })}
    </>
  );
}

/**
 * One event, rendered for one specific calendar `day` it's being shown on
 * (a multi-day event gets one card per day it covers — DaySection is what
 * decides which days that is, via calendarDates.ts's daysEventCovers, so
 * this component only ever has to describe a single day's worth of it).
 *
 * A real `<button>` now (C4) — tapping opens the detail sheet. 48px
 * minimum height already held before this change (the card's own padding
 * plus a 28px avatar), so no size adjustment was needed to satisfy the
 * house touch-target rule.
 */
export function EventCard({
  event,
  day,
  today,
  showLocation = false,
  compact = false,
  repeats = false,
  highlightWords,
  onOpen,
}: {
  event: CalendarEventView;
  day: Date;
  today: Date;
  /** Day view has room to show it; Week's agenda cards stay compact. */
  showLocation?: boolean;
  /** Week's agenda rows need a single-line title (`truncate`/`line-clamp`)
   * to keep the list scannable; Day view exists specifically to read a
   * whole title, so it wraps instead (`break-words`, no truncation) — see
   * the measured S3 finding on EventCard's own module comment below for
   * why reusing `showLocation` to mean both "show the location" and "wrap
   * the title" would have been the wrong shortcut: Week could plausibly
   * want one without the other later, and a prop that means two things is
   * exactly the kind of thing that quietly breaks when only one of its
   * meanings changes. Set by Week explicitly (`compact`); Day leaves it at
   * its default `false`. */
  compact?: boolean;
  /** Search page: this one row stands for a repeating event, so the time line ends "Repeats". */
  repeats?: boolean;
  /** Search page: the typed words (`tokens(query)`) to mark in the title and place. */
  highlightWords?: string[];
  /** Opens the detail sheet for this event/day pair — see EventDetailSheet
   * and its caller in CalendarViews.tsx. */
  onOpen: () => void;
}) {
  // formatAllDayLabel returns null for a plain single-day timed event —
  // that's this file's own cue to fall back to formatTimeRange instead,
  // per that function's doc comment in calendarDates.ts.
  const badge =
    formatAllDayLabel(event.startAt, event.endAt, event.allDay, day) ??
    formatTimeRange(event.startAt, event.endAt);

  const past = isPast(event.endAt, today);
  // Strange's verbatim past-event instruction (mission-8, C4/C8): opacity
  // is the wrong tool, a tappable card's opacity must stay 1. Mission 77
  // (style D): a live card is solid person colour with white text; a past
  // one is a 15% wash with a 4px stripe in the first person's colour and
  // `text-muted-strong` text, AvatarBadge staying full colour (identity,
  // not state). All of it comes from `personFill` (src/lib/color.ts), which
  // paints one band per person, uncapped here.
  //
  // Deliberately NO line-through here. That vocabulary means DONE (a
  // checked grocery item, a completed task); a past event is "already
  // happened", a different claim, and must never be styled like a done task.
  const fill = personFill(
    event.people.map((p) => avatarColorHex(p.avatarColor)),
    past,
    4,
  );
  const plain = fill.look === "none";
  // Muted lines inherit the card's text colour once it is painted.
  const mutedText = plain ? "text-muted" : "";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-xl border p-3 text-left ${plain ? "border-line" : `border-transparent ${fill.textClass}`}`}
      // The faded wash names its opaque `var(--surface)` backdrop inside the
      // SAME `background` shorthand: a separate `bg-surface` class would be
      // silently overridden by this inline style (Strange's S2 finding).
      style={plain ? undefined : fill.style}
    >
      <div className={`flex gap-3 ${compact ? "items-start justify-between" : "flex-col"}`}>
        <div className="min-w-0 flex-1">
          <p
            className={`text-base ${past ? "font-medium" : "font-semibold"} ${plain ? (past ? "text-muted" : "text-fg") : ""} ${
              compact ? "line-clamp-2" : "break-words"
            }`}
          >
            <HighlightedText text={event.title} words={highlightWords} />
          </p>
          <p className={`mt-0.5 text-sm ${mutedText}`}>
            {badge}
            {repeats && " · Repeats"}
          </p>
          {showLocation && event.location && (
            <p className={`mt-0.5 text-sm ${mutedText} ${compact ? "truncate" : "break-words"}`}>
              <HighlightedText text={event.location} words={highlightWords} />
            </p>
          )}
        </div>

        {event.people.length > 0 && (
          <div
            className={
              compact
                ? "flex shrink-0 -space-x-1.5 self-start"
                : "flex flex-wrap items-center gap-1"
            }
          >
            {event.people.map((person) => (
              <AvatarBadge
                key={person.userId}
                displayName={person.displayName}
                avatarColor={person.avatarColor}
                size={28}
                // The overlap-stack (Week/compact only) needs a ring in the
                // card's own background color so two overlapping swatches
                // of the same-first-letter people (E/E, L/L) stay visually
                // separated rather than reading as one blob — never "+N",
                // per the plan: five people is the whole household.
                className={fill.look === "solid" ? "ring-2 ring-white" : compact ? "ring-2 ring-surface" : ""}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
