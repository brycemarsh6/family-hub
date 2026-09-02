import { AvatarBadge } from "./AvatarBadge";
import { avatarColorHex } from "@/lib/constants";
import { formatAllDayLabel, formatTimeRange, isPast } from "@/lib/calendarDates";
import type { CalendarEventView } from "./CalendarViews";

/**
 * One event, rendered for one specific calendar `day` it's being shown on
 * (a multi-day event gets one card per day it covers — DaySection is what
 * decides which days that is, via calendarDates.ts's daysEventCovers, so
 * this component only ever has to describe a single day's worth of it).
 *
 * Read-only in K1 (C3) — no onClick, no swipe, no ⋯. C4 adds the tap-to-open
 * detail sheet on top of this same card.
 */
export function EventCard({
  event,
  day,
  today,
  showLocation = false,
}: {
  event: CalendarEventView;
  day: Date;
  today: Date;
  /** Day view has room to show it; Week's agenda cards stay compact. */
  showLocation?: boolean;
}) {
  // formatAllDayLabel returns null for a plain single-day timed event —
  // that's this file's own cue to fall back to formatTimeRange instead,
  // per that function's doc comment in calendarDates.ts.
  const badge =
    formatAllDayLabel(event.startAt, event.endAt, event.allDay, day) ??
    formatTimeRange(event.startAt, event.endAt);

  const past = isPast(event.endAt, today);
  const background = bandBackground(event.people.map((p) => p.avatarColor));

  return (
    <div
      className={`rounded-xl border border-line p-3 transition-opacity ${
        past ? "opacity-55" : ""
      }`}
      style={background ? { background } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-fg">{event.title}</p>
          <p className="mt-0.5 text-sm text-muted">{badge}</p>
          {showLocation && event.location && (
            <p className="mt-0.5 truncate text-sm text-muted">{event.location}</p>
          )}
        </div>

        {event.people.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {event.people.map((person) => (
              <AvatarBadge
                key={person.userId}
                displayName={person.displayName}
                avatarColor={person.avatarColor}
                size={28}
              />
            ))}
          </div>
        )}
      </div>
    </div>
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
 * rather than a blend, at a low enough alpha that the card's own --fg text
 * stays readable over any of the 8 AVATAR_COLORS without a per-color
 * contrast check — a full-saturation fill would need one (that palette is
 * calibrated for white text specifically, see AvatarBadge's own comment).
 * A single-person event is the same construction with one 100%-wide band,
 * not a separate code path. Returns undefined for a person-less event
 * (there is always at least one person once C4 ships creation, but a
 * defensive fallback costs nothing).
 */
function bandBackground(avatarColors: string[]): string | undefined {
  if (avatarColors.length === 0) return undefined;
  const bandWidth = 100 / avatarColors.length;
  const stops = avatarColors.flatMap((name, index) => {
    const color = hexToRgba(avatarColorHex(name), 0.16);
    const start = index * bandWidth;
    const end = (index + 1) * bandWidth;
    return [`${color} ${start}%`, `${color} ${end}%`];
  });
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}
