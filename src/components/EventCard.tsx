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
 * Read-only in K1 (C3) — no onClick, no swipe, no ⋯. C4 adds the tap-to-open
 * detail sheet on top of this same card.
 */
export function EventCard({
  event,
  day,
  today,
  showLocation = false,
  compact = false,
}: {
  event: CalendarEventView;
  day: Date;
  today: Date;
  /** Day view has room to show it; Week's agenda cards stay compact. */
  showLocation?: boolean;
  /** Week's agenda rows need a single-line title (`truncate`) to keep the
   * list scannable; Day view exists specifically to read a whole title, so
   * it wraps instead (`break-words`, no truncation) — see the measured S3
   * finding on EventCard's own module comment below for why reusing
   * `showLocation` to mean both "show the location" and "wrap the title"
   * would have been the wrong shortcut: Week could plausibly want one
   * without the other later, and a prop that means two things is exactly
   * the kind of thing that quietly breaks when only one of its meanings
   * changes. Set by Week explicitly (`compact`); Day leaves it at its
   * default `false`. */
  compact?: boolean;
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-base font-semibold text-fg ${
              compact ? "truncate" : "break-words"
            }`}
          >
            {event.title}
          </p>
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
 * rather than a blend. A single-person event is the same construction with
 * one 100%-wide band, not a separate code path. Returns undefined for a
 * person-less event (there is always at least one person once C4 ships
 * creation, but a defensive fallback costs nothing).
 *
 * The alpha is 0.10 (was 0.16, briefly 0.12 — see below), and this needs an
 * opaque `var(--surface)` backdrop in the same `background` shorthand to
 * mean anything real (the caller supplies that). Earlier text here claimed
 * the alpha was chosen "without a per-color contrast check" — that was
 * false, not just imprecise: measured against the rendered page, the worst
 * of the 8 AVATAR_COLORS came out at 3.77:1 in light mode (mission-8's
 * Strange S2 finding), well under the 4.5 floor, because the card had no
 * opaque backdrop at all and the translucent band was actually compositing
 * over the page's cream `--bg`, not the white `--surface` this comment had
 * assumed. Fixed two ways together: an explicit `--surface` backdrop (see
 * the caller) and a lower alpha. 0.12 measures to 4.50 in light mode —
 * exactly the floor, with no margin — so 0.10 was tried instead per the
 * contract's own preference for headroom. Measured for real (a live
 * EventCard's own `getComputedStyle`, not a hand calculation) across all 8
 * AVATAR_COLORS in both themes: worst case **4.64:1 light / 5.53:1 dark**,
 * while still reading as 8 visibly different people at 28px. Re-measure
 * this comment's numbers if AVATAR_COLORS, `--surface`, or `--muted` ever
 * change.
 */
function bandBackground(avatarColors: string[]): string | undefined {
  if (avatarColors.length === 0) return undefined;
  const bandWidth = 100 / avatarColors.length;
  const stops = avatarColors.flatMap((name, index) => {
    const color = hexToRgba(avatarColorHex(name), 0.1);
    const start = index * bandWidth;
    const end = (index + 1) * bandWidth;
    return [`${color} ${start}%`, `${color} ${end}%`];
  });
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}
