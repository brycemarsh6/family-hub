import { AvatarBadge } from "./AvatarBadge";
import { avatarColorHex } from "@/lib/constants";
import { formatAllDayLabel, formatTimeRange, isPast } from "@/lib/calendarDates";
import type { CalendarEventView } from "@/lib/types";

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
  // is the wrong tool (0.55 measured 2.62:1; even 0.80 left the muted time
  // line at 3.53) — a tappable card's opacity must stay 1 so it keeps
  // reading as tappable. Past state is carried by TWO signals instead:
  // the title drops from text-fg/font-semibold to text-muted/font-medium
  // (5.38:1 light / 6.12:1 dark, both AA — font-medium restores the
  // title-over-time weight hierarchy a past card otherwise loses, since
  // the time line below is already font-normal), and the color bands
  // halve to 0.05 alpha so the tint drains without touching AvatarBadge,
  // which stays full color — identity, not state. No line-through: that
  // vocabulary means cancelled, not "already happened."
  const background = bandBackground(
    event.people.map((p) => p.avatarColor),
    past ? 0.05 : 0.1,
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-line p-3 text-left"
      // `background` is a gradient of translucent bands ONLY — it needs an
      // opaque layer underneath for the alpha math bandBackground()'s own
      // comment describes to mean anything, and that layer has to be named
      // in this SAME shorthand: a separate `bg-surface` Tailwind class gets
      // silently overridden by this inline `background` (the more specific
      // property wins), which is exactly what the pre-fix code did and why
      // the measured contrast came out wrong in Strange's S2 finding —
      // without an opaque backdrop, the "alpha over --surface" contrast
      // math was never what was actually on screen.
      style={background ? { background: `${background}, var(--surface)` } : undefined}
    >
      <div className={`flex gap-3 ${compact ? "items-start justify-between" : "flex-col"}`}>
        <div className="min-w-0 flex-1">
          <p
            className={`text-base ${past ? "font-medium text-muted" : "font-semibold text-fg"} ${
              compact ? "line-clamp-2" : "break-words"
            }`}
          >
            {event.title}
          </p>
          <p className="mt-0.5 text-sm text-muted">{badge}</p>
          {showLocation && event.location && (
            <p className={`mt-0.5 text-sm text-muted ${compact ? "truncate" : "break-words"}`}>
              {event.location}
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
                className={compact ? "ring-2 ring-surface" : ""}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/** `#rrggbb` -> `rgba(r, g, b, alpha)`. AVATAR_COLORS (constants.ts) are all
 * plain 6-digit hex, so this doesn't need to handle shorthand (#rgb) or
 * named colors — the one format that vocabulary ever produces. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The "diagonal color bands" background from the K0 walkthrough (Skylight's
 * Week view, screenshot 2): one translucent band per person, hard edges
 * rather than a blend. A single-person event is the same construction with
 * one 100%-wide band, not a separate code path. Returns undefined for a
 * person-less event (there is always at least one person once C4 ships
 * creation, but a defensive fallback costs nothing).
 *
 * `alpha` is now a parameter (C4) rather than a fixed constant — the
 * caller passes 0.05 for a past event, draining the tint the same way the
 * title drops to muted, and 0.10 otherwise. 0.10 is the value mission-8's
 * Strange pass-2 measured across all 8 AVATAR_COLORS in both themes: worst
 * case **4.64:1 light / 5.53:1 dark**, both clear of the 4.5 AA floor, and
 * still readable as visibly different people at 28px. This needs an
 * opaque `var(--surface)` backdrop in the same `background` shorthand to
 * mean anything real (the caller supplies that) — see the caller's own
 * comment for why an earlier version without one measured the wrong thing
 * entirely (compositing over the page's cream `--bg`, not `--surface`).
 */
function bandBackground(avatarColors: string[], alpha: number): string | undefined {
  if (avatarColors.length === 0) return undefined;
  const bandWidth = 100 / avatarColors.length;
  const stops = avatarColors.flatMap((name, index) => {
    const color = hexToRgba(avatarColorHex(name), alpha);
    const start = index * bandWidth;
    const end = (index + 1) * bandWidth;
    return [`${color} ${start}%`, `${color} ${end}%`];
  });
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}
